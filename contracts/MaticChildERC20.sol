pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import { SafeMath } from "./SafeMath.sol";

contract MaticChildERC20 {
  using SafeMath for uint256;

  event Transfer(
    address indexed from, 
    address indexed to, 
    uint256 value
  );

  event Approval(
    address indexed owner, 
    address indexed spender, 
    uint256 value
  );

  event Deposit(
    address indexed token,
    address indexed from,
    uint256 amount,
    uint256 input1,
    uint256 output1
  );

  event Withdraw(
    address indexed token,
    address indexed from,
    uint256 amount,
    uint256 input1,
    uint256 output1
  );

  event LogTransfer(
    address indexed token,
    address indexed from,
    address indexed to,
    uint256 amount,
    uint256 input1,
    uint256 input2,
    uint256 output1,
    uint256 output2
  );

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

  // decimals
  uint256 private decimals = 10**18;

  // default token
  address public constant token = 0x0000000000000000000000000000000000001010; // set token

  // current supply
  uint256 public currentSupply = 0;

  // contructor
  constructor() public {}

  function deposit(address payable user, uint256 amount) public { // onlyOwner // {
    // check for amount and user
    require(amount > 0 && user != address(0x0));

    // input balance
    uint256 input1 = balanceOf(user);

    // transfer amount to user
    user.transfer(amount);

    // deposit events
    emit Deposit(token, user, amount, input1, balanceOf(user));

    // update current supply
    currentSupply = currentSupply.add(amount);

    // keep current supply <= total supply
    require(currentSupply <= totalSupply());
  }

  function withdraw(uint256 amount) payable public {
    address user = msg.sender;
    // input balance
    uint256 input = balanceOf(user);

    // check for amount
    require(amount > 0 && input >= amount && msg.value == amount);

    // withdraw event
    emit Withdraw(token, user, amount, input, balanceOf(user));

    // update current supply
    currentSupply = currentSupply.sub(amount);
  }

  function transfer(address payable recipient, uint256 amount) payable public returns (bool) {
    return transferFrom(msg.sender, recipient, amount);
  }

  function allowance(address, address) public view returns (uint256) {
    return 0;
  }

  function approve(address, uint256) public returns (bool) {
    return false;
  }

  function transferFrom(address from, address payable to, uint256 amount) payable public returns (bool) {
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
