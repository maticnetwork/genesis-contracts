pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;


contract TestCommitState {
    
    uint256 public id;
    bytes public data;

    function onStateReceive(
        uint256 _id, /* id */
        bytes calldata _data
    ) external {
        id = _id;
        data = _data;
    }
}
