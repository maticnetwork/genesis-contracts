pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;


contract TestCommitState {

    uint256 public id;
    bytes public data;

    function onStateReceive(
        uint256 _id, /* id */
        bytes calldata _data
    ) external {
        (,,,uint256 num) = abi.decode(_data, (address, address, uint256, uint256));
        // dummy loop
        for (uint256 i = 0; i < num; i++) {
            id = i;
        }
        id = _id;
        data = _data;
    }
}
