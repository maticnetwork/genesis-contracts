pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import {BorValidatorSet} from "../BorValidatorSet.sol";

contract TestBorValidatorSet is BorValidatorSet {
  address public dummySystem =0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE;

  function setSystemAddress(address _system) public {
    dummySystem = _system;
  }

  modifier onlySystem() {
    require(msg.sender == dummySystem);
    _;
  }
}
