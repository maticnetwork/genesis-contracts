pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import {StateReceiver} from "../StateReceiver.sol";
import {TestSystem} from "./TestSystem.sol";

contract TestStateReceiver is StateReceiver, TestSystem {}
