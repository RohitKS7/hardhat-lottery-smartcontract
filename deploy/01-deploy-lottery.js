const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { network, ethers } = require("hardhat")
const { verify } = require("../utils/verify")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2Address, subscriptionId

    const FUND_AMOUNT = ethers.utils.parseEther("1")

    // SECTION getting vrfCoordinatorV2 Address for constructor argument
    if (chainId == 31337) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address

        // Creating SubscriptionId and Funding it. programmtically for Development Chains
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)

        // NOTE inside transactionReceipt an eventss (subscriptionId) is emitted by vrfMock contract, which we can grab here
        subscriptionId = transactionReceipt.events[0].args.subId

        // FUND the subscription (usually, you'd need the link token on a real network)
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    const entranceFee = networkConfig[chainId]["entranceFee"]
    const gaslane = networkConfig[chainId]["gaslane"]
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
    const interval = networkConfig[chainId]["interval"]

    const arguments = [
        vrfCoordinatorV2Address,
        entranceFee,
        gaslane,
        subscriptionId,
        // networkConfig[chainId]["entranceFee"],
        callbackGasLimit,
        interval,
        // networkConfig[chainId]["gaslane"],
        // networkConfig[chainId]["callbackGasLimit"],
        // networkConfig[chainId]["interval"],
    ]

    const lottery = await deploy("Lottery", {
        from: deployer,
        args: arguments,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    // Manually adding a consumer for the vrfCoordinatorV2Mock
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId.toNumber(), lottery.address)
    }

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("verifying...")
        await verify(lottery.address, arguments)
    }

    log("-------------------------------------")
}

module.exports.tags = ["all", "lottery"]
