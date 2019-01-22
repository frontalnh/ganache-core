const Web3 = require("web3");
const Web3WsProvider = require("web3-providers-ws");
const assert = require("assert");
const Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");
// const fs = require("fs");
// const solc = require("solc");
const bootstrap = require("./helpers/contract/bootstrap");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

const logger = {
  log: function(msg) {
    /* console.log(msg) */
  }
};

/**
 * NOTE: Naming in these tests is a bit confusing. Here, the "main chain"
 * is the main chain the tests interact with; and the "forked chain" is the
 * chain that _was forked_. This is in contrast to general naming, where the
 * main chain represents the main chain to be forked (like the Ethereum live
 * network) and the fork chaing being "the fork".
 */

describe("Contract Deployed on Main Chain After Fork", function() {
  const mainContract = "Example";
  const contractFilenames = [];
  const contractPath = "../../contracts/examples/";
  const options = {};

  const services = bootstrap(mainContract, contractFilenames, options, contractPath);

  let contract;
  let contractAddress;
  let forkedServer;
  // let mainAccounts;

  let forkedWeb3 = new Web3();
  let mainWeb3 = new Web3();

  var forkedTargetUrl = "ws://localhost:21345";

  before("set up test data", function() {
    this.timeout(10000);
    const { abi, bytecode, sources } = services;

    // Note: Certain properties of the following contract data are hardcoded to
    // maintain repeatable tests. If you significantly change the solidity code,
    // make sure to update the resulting contract data with the correct values.
    contract = {
      solidity: sources,
      abi,
      binary: bytecode,
      position_of_value: "0x0000000000000000000000000000000000000000000000000000000000000000",
      expected_default_value: 5,
      call_data: {
        gas: "0x2fefd8",
        gasPrice: "0x1", // This is important, as passing it has exposed errors in the past.
        to: null, // set by test
        data: "0x3fa4f245"
      },
      transaction_data: {
        from: null, // set by test
        gas: "0x2fefd8",
        to: null, // set by test
        data: "0x552410770000000000000000000000000000000000000000000000000000000000000019" // sets value to 25 (base 10)
      }
    };
  });

  before("Initialize Fallback Ganache server", async function() {
    this.timeout(10000);
    forkedServer = Ganache.server({
      // Do not change seed. Determinism matters for these tests.
      seed: "let's make this deterministic",
      ws: true,
      logger: logger
    });

    await forkedServer.listen(21345);
  });

  before("set forkedWeb3 provider", () => {
    forkedWeb3.setProvider(new Web3WsProvider(forkedTargetUrl));
  });

  before("Set main web3 provider, forking from forked chain at this point", () => {
    mainWeb3.setProvider(
      Ganache.provider({
        fork: forkedTargetUrl.replace("ws", "http"),
        logger,
        verbose: true,

        // Do not change seed. Determinism matters for these tests.
        seed: "a different seed"
      })
    );
  });

  /*
  before("Gather main accounts", async function() {
    this.timeout(5000);
    mainAccounts = await mainWeb3.eth.getAccounts();
  });
  */

  before("Deploy initial contract", async function() {
    const { accounts, web3 } = services;

    const receipt = await web3.eth.sendTransaction({
      from: accounts[0],
      data: contract.binary,
      gas: 3141592,
      value: web3.utils.toWei("1", "ether")
    });

    contractAddress = receipt.contractAddress;

    // Ensure there's *something* there.
    const code = await web3.eth.getCode(contractAddress);
    assert.notStrictEqual(code, null);
    assert.notStrictEqual(code, "0x");
    assert.notStrictEqual(code, "0x0");
  });

  it("should send 1 ether to the created contract, checked on the forked chain", async function() {
    const { web3 } = services;
    const balance = await web3.eth.getBalance(contractAddress);

    assert.strictEqual(balance, web3.utils.toWei("1", "ether"));
  });

  after("Shutdown server", function(done) {
    forkedWeb3._provider.connection.close();
    forkedServer.close(function(serverCloseErr) {
      forkedWeb3.setProvider();
      let mainProvider = mainWeb3._provider;
      mainWeb3.setProvider();
      mainProvider.close(function(providerCloseErr) {
        if (serverCloseErr) {
          return done(serverCloseErr);
        }
        if (providerCloseErr) {
          return done(providerCloseErr);
        }
        done();
      });
    });
  });
});
