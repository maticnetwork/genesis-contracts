pragma solidity ^0.5.11;

interface ValidatorSet {
	// Get initial validator set
	function getInitialValidators()
		external
		view
		returns (address[] memory, uint256[] memory);

	// Get current validator set (last enacted or initial if no changes ever made) with current stake.
	function getValidators()
		external
		view
		returns (address[] memory, uint256[] memory);

	// Check if signer is validator
	function isValidator(uint256 span, address signer)
		external
		view
		returns (bool);

	// Check if signer is producer
	function isProducer(uint256 span, address signer)
		external
		view
		returns (bool);

	// Check if signer is current validator
	function isCurrentValidator(address signer)
		external
		view
		returns (bool);

	// Check if signer is current producer
	function isCurrentProducer(address signer)
		external
		view
		returns (bool);

	// Propose new span
	function proposeSpan()
		external;

	// Pending span proposal
	function spanProposalPending()
		external
		view
		returns (bool);

	// Commit span
	function commitSpan(
		uint256 newSpan,
		uint256 startBlock,
		uint256 endBlock,
		bytes calldata validatorBytes,
		bytes calldata producerBytes
	) external;

	function getSpan(uint256 span)
		external
		view
		returns (uint256 number, uint256 startBlock, uint256 endBlock);

	function getCurrentSpan()
		external
		view 
		returns (uint256 number, uint256 startBlock, uint256 endBlock);	

	function getNextSpan()
		external
		view
		returns (uint256 number, uint256 startBlock, uint256 endBlock);	

	function currentSpanNumber()
		external
		view
		returns (uint256);

	function getSpanByBlock(uint256 number)
		external
		view
		returns (uint256);

	function getBorValidators(uint256 number)
		external
		view
		returns (address[] memory, uint256[] memory);
}
