// SPDX-License-Identifier: UNLICENSED
pragma solidity >0.5.0;

event StateCommitted(uint256 indexed stateId, bool success);

interface IStateReceiver {
    function SYSTEM_ADDRESS() external view returns (address);
    function commitState(uint256 syncTime, bytes memory recordBytes) external returns (bool success);
    function lastStateId() external view returns (uint256);
}
