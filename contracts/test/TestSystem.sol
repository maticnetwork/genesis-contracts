pragma solidity ^0.5.11;

contract TestSystem {
  address public dummySystem;

  function setSystemAddress(address _system) public {
    dummySystem = _system;
  }

  modifier onlySystem() {
    require(msg.sender == dummySystem, "Not System Addess!");
    _;
  }
}
