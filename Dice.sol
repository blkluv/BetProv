// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DiceGame {
    mapping(address => uint256) public balances;
    event DiceRolled(address indexed player, uint256 roll, bool win);

    constructor() {
        balances[msg.sender] = 1000 * 10**18;
    }

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) public payable {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }

    function rollDice(uint256 betAmount) public {
        require(balances[msg.sender] >= betAmount, "Insufficient balance");
        require(betAmount > 0, "Bet must be greater than zero");
        
        uint256 roll = (uint256(blockhash(block.number - 1)) % 6) + 1;
        bool win = roll >= 4;

        balances[msg.sender] -= betAmount;
        if (win) {
            balances[msg.sender] += betAmount * 2;
        }
        
        emit DiceRolled(msg.sender, roll, win);
    }
}
