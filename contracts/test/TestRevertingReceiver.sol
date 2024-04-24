pragma solidity ^0.5.11;

contract TestRevertingReceiver {
    bool public shouldIRevert = true;
    function onStateReceive(uint256 _id, bytes calldata _data) external {
        if (shouldIRevert) revert("TestRevertingReceiver");
    }

    function toggle() external {
        shouldIRevert = !shouldIRevert;
    }
}
