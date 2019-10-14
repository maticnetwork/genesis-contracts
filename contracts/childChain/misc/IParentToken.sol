pragma solidity ^0.5.11;
//interface for parent contract of any child token


interface IParentToken {
  function beforeTransfer(address sender, address to, uint256 value) external returns(bool);
}
