pragma solidity ^0.5.11;

import { SafeMath } from "openzeppelin-solidity/contracts/math/SafeMath.sol";
import { RLPReader } from "solidity-rlp/contracts/RLPReader.sol";

import { System } from "./System.sol";
import { ValidatorVerifier } from "./ValidatorVerifier.sol";
import { IStateReceiver } from "./IStateReceiver.sol";
import { IterableMapping } from "./IterableMapping.sol";


contract StateReceiver is System, ValidatorVerifier {
  using SafeMath for uint256;
  using RLPReader for bytes;
  using RLPReader for RLPReader.RLPItem;

  // proposed states
  IterableMapping.Map private proposedStates;

  // states and proposed states
  mapping(uint256 => bool) public states;

  // add pending state
  function proposeState(
    uint256 stateId
  ) external {
    // check if sender is validator
   require(isValidator(msg.sender),"Invalid validator");

    // check if state is already proposed
    require(IterableMapping.contains(proposedStates, stateId) == false, "State already proposed");

    // state should not prense
    require(states[stateId] == false, "State already committed");

    // propose state by adding it into proposed states
    IterableMapping.insert(proposedStates, stateId, true);
  }

  // commit new state
  function commitState(
    bytes calldata recordBytes
  ) external onlySystem {
    RLPReader.RLPItem[] memory dataList = recordBytes.toRlpItem().toList();

    // get data
    uint256 stateId = dataList[0].toUint();
    address contractAddress = dataList[1].toAddress();
    bytes memory stateData = dataList[2].toBytes();

    // check if state id is proposed and not commited
    require(IterableMapping.contains(proposedStates, stateId) == true, "Invalid proposed state id");
    require(states[stateId] == false, "Invalid state id");

    // notify state receiver contract
    if (isContract(contractAddress)) {
      IStateReceiver(contractAddress).onStateReceive(stateId, stateData);
    }

    // commit state
    states[stateId] = true;

    // delete proposed state
    IterableMapping.remove(proposedStates, stateId);
  }

  // check if address is contract
  function isContract(address _addr) private view returns (bool){
    uint32 size;
    assembly {
      size := extcodesize(_addr)
    }
    return (size > 0);
  }

  // get pending state ids
  function getPendingStates() public view returns (uint256[] memory) {
    uint256 index = 0;
    uint256[] memory result = new uint256[](proposedStates.size);
    for (uint256 i = IterableMapping.start(proposedStates); IterableMapping.valid(proposedStates, i); i = IterableMapping.next(proposedStates, i)) {
      uint256 key;
      bool value;
      (key, value) = IterableMapping.get(proposedStates, i);
      result[index] = key;
      index = index + 1;
    }
    return result;
  }
}
