pragma solidity ^0.5.11;

import { RLPReader } from "solidity-rlp/contracts/RLPReader.sol";

import { System } from "./System.sol";
import { IStateReceiver } from "./IStateReceiver.sol";

contract StateReceiver is System {
  using RLPReader for bytes;
  using RLPReader for RLPReader.RLPItem;

  uint256 public lastStateSyncTime;

  // stateId to isSynced
  mapping(uint256 => bool) public states;

  // commit new state
  function commitState(
    bytes calldata recordBytes,
    uint256 syncTime
  ) external onlySystem {
    require(
      syncTime >= lastStateSyncTime,
      "Attempting to sync states from the past"
    );
    lastStateSyncTime = syncTime;

    // parse state data
    RLPReader.RLPItem[] memory dataList = recordBytes.toRlpItem().toList();
    uint256 stateId = dataList[0].toUint();
    address receiver = dataList[1].toAddress();
    bytes memory stateData = dataList[2].toBytes();

    require(states[stateId] == false, "State was already processed");
    states[stateId] = true;

    // notify state receiver contract, in a non-revert manner
    if (isContract(receiver)) {
      // (bool success, bytes memory result) =
      receiver.call(abi.encodeWithSignature("onStateReceive(uint256,bytes)", stateId, stateData));
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
