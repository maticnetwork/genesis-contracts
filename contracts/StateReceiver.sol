pragma solidity ^0.5.11;

import { RLPReader } from "solidity-rlp/contracts/RLPReader.sol";

import { System } from "./System.sol";
import { IStateReceiver } from "./IStateReceiver.sol";

contract StateReceiver is System {
  using RLPReader for bytes;
  using RLPReader for RLPReader.RLPItem;

  uint256 public lastStateId;

  function commitState(uint256 syncTime, bytes calldata recordBytes) onlySystem external returns(bool success) {
    // parse state data
    RLPReader.RLPItem[] memory dataList = recordBytes.toRlpItem().toList();
    uint256 stateId = dataList[0].toUint();
    require(
      lastStateId + 1 == stateId,
      "StateIds are not sequential"
    );
    lastStateId++;

    address receiver = dataList[1].toAddress();
    bytes memory stateData = dataList[2].toBytes();
    // notify state receiver contract, in a non-revert manner
    if (isContract(receiver)) {
      uint256 txGas = 5000000;
      bytes memory data = abi.encodeWithSignature("onStateReceive(uint256,bytes)", stateId, stateData);
      // solium-disable-next-line security/no-inline-assembly
      assembly {
        success := call(txGas, receiver, 0, add(data, 0x20), mload(data), 0, 0)
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
