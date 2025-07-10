// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MonadFaucet {
    uint256 public constant FAUCET_AMOUNT = 0.5 ether; // 0.5 MONAD
    uint256 public constant MAX_BALANCE = 5 ether;     // 5 MONAD
    uint256 public constant COOLDOWN = 1 days;

    mapping(address => uint256) public lastClaim;

    event FaucetSuccess(address indexed recipient, uint256 amount, uint256 nextEligibleTime);
    event FaucetDenied(address indexed recipient, string reason);

    constructor() payable {}

    function faucet() external {
        require(msg.sender.balance <= MAX_BALANCE, "Ineligible: Balance exceeds 5 MONAD");
        require(block.timestamp >= lastClaim[msg.sender] + COOLDOWN, "Already claimed: Wait 24 hours");
        require(address(this).balance >= FAUCET_AMOUNT, "Faucet empty");

        lastClaim[msg.sender] = block.timestamp;
        (bool sent, ) = msg.sender.call{value: FAUCET_AMOUNT}("");
        require(sent, "Transfer failed");

        emit FaucetSuccess(msg.sender, FAUCET_AMOUNT, block.timestamp + COOLDOWN);
    }

    // Allow anyone to send MONAD to this contract
    receive() external payable {}
} 