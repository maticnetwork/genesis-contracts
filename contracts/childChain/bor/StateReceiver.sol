pragma solidity ^0.5.11;

// StateReceiver represents interface to receive state
interface StateReceiver {
  function onStateReceive(uint256 id, bytes calldata data) external;
}
