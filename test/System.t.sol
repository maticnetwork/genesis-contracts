pragma solidity >0.5.0;

import "../lib/forge-std/src/Test.sol";

import "./helpers/ISystem.sol";

contract SystemTest is Test {
    ISystem internal system;

    function setUp() public {
        system = ISystem(deployCode("out/System.sol/System.json"));
    }

    function test_constants() public {
        assertEq(system.SYSTEM_ADDRESS(), 0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE);
    }
}
