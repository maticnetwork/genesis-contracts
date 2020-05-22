pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;


contract TestCommitStateFail {
    uint256 public id;
    bytes public data;

    function onStateReceive(
        uint256 _id, /* id */
        bytes calldata _data
    ) external {
        id = _id;
        data = _data;
        for (uint256 i = 1; i > 0; i++) {
            (
                address user,
                address rootToken,
                uint256 amountOrTokenId,
                uint256 depositId
            ) = abi.decode(_data, (address, address, uint256, uint256));
        }
    }
}
