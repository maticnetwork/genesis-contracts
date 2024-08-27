pragma solidity >0.5.0;

import "../lib/forge-std/src/Test.sol";

import "./helpers/IStateReceiver.sol";

contract StateReceiverTest is Test {
    address public constant SYSTEM_ADDRESS = 0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE;
    uint8 constant LIST_SHORT_START = 0xc0;

    IStateReceiver internal stateReceiver;

    function setUp() public {
        stateReceiver = IStateReceiver(deployCode("out/StateReceiver.sol/StateReceiver.json"));
    }

    function testRevert_commitState_OnlySystem() public {
        vm.expectRevert("Not System Addess!");
        stateReceiver.commitState(0, "");
    }

    function testRevert_commitState_StateIdsAreNotSequential() public {
        bytes memory recordBytes = _encodeRecord(2, address(0), "");
        vm.expectRevert("StateIds are not sequential");
        vm.prank(SYSTEM_ADDRESS);
        stateReceiver.commitState(0, recordBytes);
    }

    function test_commitState_ReceiverNotContract() public {
        uint256 stateId = 1;
        address receiver = makeAddr("receiver");
        bytes memory recordBytes = _encodeRecord(stateId, receiver, "");

        vm.prank(SYSTEM_ADDRESS);
        assertFalse(stateReceiver.commitState(0, recordBytes));
        assertEq(stateReceiver.lastStateId(), 1);
    }

    function test_commitState_ReceiverReverts() public {
        uint256 stateId = 1;
        address receiver = makeAddr("receiver");
        vm.etch(receiver, "00");
        vm.mockCallRevert(receiver, "", "");
        bytes memory stateData = "State data";
        bytes memory recordBytes = _encodeRecord(stateId, receiver, stateData);

        vm.expectCallMinGas(receiver, 0, 5_000_000, abi.encodeWithSignature("onStateReceive(uint256,bytes)", stateId, stateData));
        vm.prank(SYSTEM_ADDRESS);
        vm.expectEmit();
        emit StateCommitted(stateId, false);
        assertFalse(stateReceiver.commitState(0, recordBytes));
        assertEq(stateReceiver.lastStateId(), 1);
    }

    function test_commitState_Success() public {
        uint256 stateId = 1;
        address receiver = makeAddr("receiver");
        vm.etch(receiver, "00");
        bytes memory stateData = "State data";
        bytes memory recordBytes = _encodeRecord(stateId, receiver, stateData);

        vm.expectCallMinGas(receiver, 0, 5_000_000, abi.encodeWithSignature("onStateReceive(uint256,bytes)", stateId, stateData));
        vm.prank(SYSTEM_ADDRESS);
        vm.expectEmit();
        emit StateCommitted(stateId, true);
        assertTrue(stateReceiver.commitState(0, recordBytes));
        assertEq(stateReceiver.lastStateId(), 1);
    }

    function _encodeRecord(uint256 stateId, address receiver, bytes memory stateData) public returns (bytes memory recordBytes) {
        return abi.encodePacked(LIST_SHORT_START, _rlpEncodeUint(stateId), _rlpEncodeAddress(receiver), _rlpEncodeBytes(stateData));
    }

    function _rlpEncodeUint(uint256 value) internal pure returns (bytes memory) {
        if (value == 0) {
            return hex"80";
        } else if (value < 0x80) {
            return abi.encodePacked(uint8(value));
        } else {
            bytes memory result = new bytes(33);
            uint256 length = 0;
            while (value != 0) {
                length++;
                result[33 - length] = bytes1(uint8(value));
                value >>= 8;
            }
            bytes memory encoded = new bytes(length + 1);
            encoded[0] = bytes1(uint8(0x80 + length));
            for (uint256 i = 0; i < length; i++) {
                encoded[i + 1] = result[33 - length + i];
            }
            return encoded;
        }
    }

    function _rlpEncodeAddress(address value) internal pure returns (bytes memory) {
        bytes memory encoded = new bytes(21);
        encoded[0] = bytes1(uint8(0x94));
        for (uint256 i = 0; i < 20; i++) {
            encoded[i + 1] = bytes1(uint8(uint256(uint160(value)) >> (8 * (19 - i))));
        }
        return encoded;
    }

    function _rlpEncodeBytes(bytes memory value) internal pure returns (bytes memory) {
        uint256 length = value.length;
        if (length == 1 && uint8(value[0]) < 0x80) {
            return value;
        } else if (length <= 55) {
            bytes memory encoded = new bytes(length + 1);
            encoded[0] = bytes1(uint8(0x80 + length));
            for (uint256 i = 0; i < length; i++) {
                encoded[i + 1] = value[i];
            }
            return encoded;
        } else {
            bytes memory lengthEncoded = _rlpEncodeUint(length);
            bytes memory encoded = new bytes(1 + lengthEncoded.length + length);
            encoded[0] = bytes1(uint8(0xb7 + lengthEncoded.length));
            for (uint256 i = 0; i < lengthEncoded.length; i++) {
                encoded[i + 1] = lengthEncoded[i];
            }
            for (uint256 i = 0; i < length; i++) {
                encoded[i + 1 + lengthEncoded.length] = value[i];
            }
            return encoded;
        }
    }
}
