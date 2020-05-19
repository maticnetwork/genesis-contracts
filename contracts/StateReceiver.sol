pragma solidity ^0.5.11;

import { RLPReader } from "solidity-rlp/contracts/RLPReader.sol";

import { System } from "./System.sol";
import { IStateReceiver } from "./IStateReceiver.sol";

contract StateReceiver is System {
  using RLPReader for bytes;
  using RLPReader for RLPReader.RLPItem;

  uint256 public lastStateSyncTime;
  uint256 public nextStateId;

  function commitState(uint256 syncTime, bytes calldata recordBytes) onlySystem external returns(bool success) {
    require(
      syncTime >= lastStateSyncTime,
      "Attempting to sync states from the past"
    );
    lastStateSyncTime = syncTime;

    // parse state data
    RLPReader.RLPItem[] memory dataList = recordBytes.toRlpItem().toList();
    uint256 stateId = dataList[0].toUint();
    require(
      nextStateId == stateId,
      "StateIds are not sequential"
    );
    nextStateId++;

    address receiver = dataList[1].toAddress();
    bytes memory stateData = dataList[2].toBytes();
    // notify state receiver contract, in a non-revert manner
    if (isContract(receiver)) {
      uint256 txGas = 1000000;
      // solium-disable-next-line security/no-inline-assembly
      assembly {
        success := call(txGas, receiver, 0, add(stateData, 0x20), mload(stateData), 0, 0)
      }
    }
  }

  // check if address is contract
  function isContract(address _addr) private view returns (bool){
    uint32 size;
    assembly {
      size := extcodesize(_addr)
    }
    return (size > 0);
  }
}
