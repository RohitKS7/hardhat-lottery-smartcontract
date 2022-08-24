const { developmentChains } = require("../helper-hardhat-config")
const { network, ethers } = require("hardhat")

const BASE_FEE = ethers.utils.parseEther("0.25") // 0.25 is premium written in "supported networks" section of Chainlink Randomness page.
// It costs 0.25 LINK per call for random word
const GAS_PRICE_LINK = 1e9 // 1000000000 // link per gas

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const args = [BASE_FEE, GAS_PRICE_LINK]

    if (developmentChains.includes(network.name)) {
        log("local network detected! Deploying mocks...")
        // deploy a mock vrfCoordinator...
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        })
        log("Mocks Deployed")
        log("------------------------------------------------------")
    }
}

module.exports.tags = ["all", "mocks"]
