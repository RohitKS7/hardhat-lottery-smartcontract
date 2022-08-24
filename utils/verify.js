const { run } = require("hardhat");

const verify = async (contractAddress, args) => {
  console.log("Verifying contract...");

  // NOTE trying to catch any errors
  try {
    // NOTE run method takes 2 parameters, here in our code first is "verify" with its subparameter which is "verify" and second will be main parameters
    // you can run this cmd in terminal for more subparameters => ` yarn hardhat verify --help `
    await run("verify:verify", {
      address: contractAddress,
      construtorArguments: args,
    });
  } catch (e) {
    // if this message(contract) already verified
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Already verified!!");
    } else {
      console.log(e);
    }
  }
};

module.exports = { verify };
