pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import { ChildERC20 } from "./ChildChain.sol";


contract MaticChildERC20 is ChildERC20 {

  event LogFeeTransfer(
    address indexed token,
    address indexed from,
    address indexed to,
    uint256 amount,
    uint256 input1,
    uint256 input2,
    uint256 output1,
    uint256 output2
  );

  address public constant TOKEN = 0x0000000000000000000000000000000000001010; // set token

  uint256 public currentSupply = 0;
  uint256 private decimals = 10**18;

  constructor() public {}

  function deposit(address payable user, uint256 amount) public onlyOwner {
    // check for amount and user
    require(amount > 0 && user != address(0x0));

    // input balance
    uint256 input1 = balanceOf(user);

    // transfer amount to user
    user.transfer(amount);

    // deposit events
    emit Deposit(TOKEN, user, amount, input1, balanceOf(user));
  }

  function withdraw(uint256 amount) payable public {
    address user = msg.sender;
    // input balance
    uint256 input = balanceOf(user);

    // check for amount
    require(amount > 0 && input >= amount && msg.value == amount);

    // withdraw event
    emit Withdraw(TOKEN, user, amount, input, balanceOf(user));
  }

  function _transferFrom(address from, address payable to, uint256 amount) payable internal returns (bool) {
    if (msg.value != amount) {
      return false;
    }

    // transfer amount to to
    to.transfer(amount);
    emit Transfer(from, to, amount);
    return true;
  }

  function totalSupply() public view returns (uint256) {
    return 10000000000 * decimals;
  }

  function balanceOf(address account) public view returns (uint256) {
    return account.balance;
  }
}
