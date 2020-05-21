pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import {StateReceiver} from "../StateReceiver.sol";

contract TestStateReceiver is StateReceiver {
  address public dummySystem =0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE;

  function setSystemAddress(address _system) public {
    dummySystem = _system;
  }

  modifier onlySystem() {
    require(msg.sender == dummySystem);
    _;
  }
}
