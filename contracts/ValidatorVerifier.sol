pragma solidity ^0.5.11;

import { ValidatorSet } from "./ValidatorSet.sol";


contract ValidatorVerifier {
  address constant public validatorSet = 0x0000000000000000000000000000000000001000;

  /**
   * @dev Throws if called by any account other than the validator set.
   */
  modifier onlyValidatorSetContract() {
    require(isValidatorSetContract(), "Verifiable: caller is not the verifiable contract");
    _;
  }

  constructor () public {
    // Doesn't work since contract is in genesis
  }

  /**
   * @dev Returns true if the caller is the current validator set contract.
   */
  function isValidatorSetContract() public view returns (bool) {
    return msg.sender == validatorSet;
  }

  // check if signer is validator
  function isValidator(address signer) public view returns (bool) {
    return ValidatorSet(validatorSet).isCurrentValidator(signer);
  }

  // check if signer is producer
  function isProducer(address signer) public view returns (bool) {
    return ValidatorSet(validatorSet).isCurrentProducer(signer);
  }
}
