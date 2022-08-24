# Install Dependencies

1. `yarn add --dev hardhat`.

2. `yarn hardhat` then choose any type of project, here we are going for empty hardhat.config

3. Now install dependencies as you go but here we are installing them at once
   `yarn add --dev @nomiclabs/hardhat-ethers@npm:hardhat-deploy-ethers ethers @nomiclabs/hardhat-etherscan @nomiclabs/hardhat-waffle chai ethereum-waffle hardhat hardhat-contract-sizer hardhat-deploy hardhat-gas-reporter prettier prettier-plugin-solidity solhint solidity-coverage dotenv`.

4. Install Chai matcher instead of Waffle `yarn add --dev @nomicfoundation/hardhat-chai-matchers`

5. Install **hardhat shorthand** npm package to write less cmd line in terminal.
    - now we can write `hh taskname` instead of `yarn hardhat taskname`.

# lottery.sol Info

Things we want to do in this smart contract :

-   Enter the lottery (paying some amount)
-   Pick a random winner (verifiably random)
-   Winner to be selected every X minutes -> completly automated

For doing this tasks we will be using chainlink orcale to get :

-   Randomness
-   Automated Execution (chainlink keeper)

### In this lesson we will be learning about "EVENTS":

1. Logging and Events
2. Viewing Events on Etherscan
3. Working with Events in Hardhat
   `see what are events in events.md file!!`
