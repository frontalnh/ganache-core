const assert = require("assert");
const to = require("../lib/utils/to.js");
const preloadWeb3 = require("./helpers/web3/preloadWeb3");
const { send } = require("./helpers/utils/rpc");

describe("to.rpcQuantityHexString", () => {
  it("should print '0x0' for input '0x'", () => {
    assert.strictEqual(to.rpcQuantityHexString("0x"), "0x0");
  });

  it("should print '0x0' for input 0", () => {
    assert.strictEqual(to.rpcQuantityHexString(0), "0x0");
  });

  it("should print '0x0' for input '0'", () => {
    assert.strictEqual(to.rpcQuantityHexString("0"), "0x0");
  });

  it("should print '0x0' for input '000'", () => {
    assert.strictEqual(to.rpcQuantityHexString("000"), "0x0");
  });

  it("should print '0x0' for input '0x000'", () => {
    assert.strictEqual(to.rpcQuantityHexString("0x000"), "0x0");
  });

  it("should print '0x20' for input '0x0020'", () => {
    assert.strictEqual(to.rpcQuantityHexString("0x0020"), "0x20");
  });
});

describe("to.rpcDataHexString", () => {
  it("should differentiate between a list of 0 items and a list of one 0", () => {
    assert.notStrictEqual(to.rpcDataHexString(Buffer.from("", "hex")), to.rpcDataHexString(Buffer.from("00", "hex")));
  });
});

describe("to.hex", () => {
  it("should print '0x' for input '' (blank)", () => {
    assert.strictEqual(to.hex(Buffer.from("")), "0x");
  });
});

describe.skip("JSON-RPC Response", () => {
  const services = preloadWeb3();
  // skipping this test for now as they aren't verifying the right thing that
  // is, leading zeroes are fine in some response fields. we need a better model
  // of expected response formatting/padding.
  it("should not have leading zeros in rpc quantity hex strings", (done) => {
    const { accounts, web3 } = services;
    const noLeadingZeros = (method, result, path) => {
      if (!path) {
        path = "result";
      }

      if (typeof result === "string") {
        if (/^0x/.test(result)) {
          const asHex = to.rpcQuantityHexString(result);
          assert.strictEqual(result, asHex, `Field ${path} in ${method} response has leading zeroes.`);
        }
      } else if (typeof result === "object") {
        for (var key in result) {
          if (result.hasOwnProperty(key)) {
            if (Array.isArray(result)) {
              path += [key];
            } else {
              path += "." + key;
            }
            noLeadingZeros(method, result[key], path + (path ? "." : "") + key);
          }
        }
      }
    };

    let method = "eth_getTransactionCount";
    let params = [accounts[0], "pending"];

    let result = send(method, params, web3);
    noLeadingZeros("eth_getTransactionCount", result);

    method = "eth_sendTransaction";
    params = [
      {
        from: accounts[0],
        to: accounts[1],
        value: "0x100000000"
      }
    ];

    // Ignore eth_sendTransaction result, it returns the transaction hash.
    // A transaction hash is a 'DATA' type, which can have leading zeroes
    // to pad it to an even string length (4 bit per char, so whole bytes).
    send(method, params, web3);

    method = "eth_getTransactionCount";
    params = [accounts[0], "pending"];
    result = send(method, params, web3);
    noLeadingZeros("eth_getTransactionCount", result);
  });
});
