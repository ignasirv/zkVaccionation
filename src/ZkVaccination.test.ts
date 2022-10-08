import { ZkVaccination } from './ZkVaccination';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
} from 'snarkyjs';
import * as assert from 'assert';
/*
 * This file specifies how to test the `ZkVaccination` smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

function createLocalBlockchain() {
  const Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);
  return Local.testAccounts[0].privateKey;
}

async function localDeploy(
  zkAppInstance: ZkVaccination,
  zkAppPrivatekey: PrivateKey,
  deployerAccount: PrivateKey
) {
  const txn = await Mina.transaction(deployerAccount, () => {
    AccountUpdate.fundNewAccount(deployerAccount);
    zkAppInstance.deploy({ zkappKey: zkAppPrivatekey });
    zkAppInstance.init();
    zkAppInstance.sign(zkAppPrivatekey);
  });
  await txn.send().wait();
}

describe('ZkVaccination', () => {
  let deployerAccount: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey;

  beforeEach(async () => {
    await isReady;
    deployerAccount = createLocalBlockchain();
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
  });

  afterAll(async () => {
    // `shutdown()` internally calls `process.exit()` which will exit the running Jest process early.
    // Specifying a timeout of 0 is a workaround to defer `shutdown()` until Jest is done running all tests.
    // This should be fixed with https://github.com/MinaProtocol/mina/issues/10943
    setTimeout(shutdown, 0);
  });

  it('generates and deploys the `ZkVaccination` smart contract', async () => {
    const zkAppInstance = new ZkVaccination(zkAppAddress);
    await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount);
    const vaccinationCount = zkAppInstance.vaccinationCount.get();
    expect(vaccinationCount).toEqual(Field.zero);
  });

  it('Adds a vaccination', async () => {
    const issuer = PrivateKey.fromBase58(
      'EKFAdBGSSXrBbaCVqy4YjwWHoGEnsqYRQTqz227Eb5bzMx2bWu3F'
    );
    const zkAppInstance = new ZkVaccination(zkAppAddress);
    await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount);
    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.addVaccination(issuer);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn.send().wait();
    const vaccinationCount = zkAppInstance.vaccinationCount.get();
    expect(vaccinationCount).toEqual(Field.one);
  });

  it('Checks a vaccination is not correct', async () => {
    try {
      const zkAppInstance = new ZkVaccination(zkAppAddress);
      await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount);
      const txn = await Mina.transaction(deployerAccount, () => {
        zkAppInstance.checkVaccination();
        zkAppInstance.sign(zkAppPrivateKey);
      });
      await txn.send().wait();
      // Force fail in case exception is not thrown
      assert.fail();
    } catch (e) {
      console.log('Not correctly vaccinated');
    }
  });

  it('Apply second vaccination and check is correct', async () => {
    const issuer = PrivateKey.fromBase58(
      'EKFAdBGSSXrBbaCVqy4YjwWHoGEnsqYRQTqz227Eb5bzMx2bWu3F'
    );
    const zkAppInstance = new ZkVaccination(zkAppAddress);
    await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount);
    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.addVaccination(issuer);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    // Apply 2 vaccinations
    await txn.send().wait();
    const txn2 = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.addVaccination(issuer);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn2.send().wait();
    const vaccinationCount = zkAppInstance.vaccinationCount.get();
    expect(vaccinationCount).toEqual(Field(2));
    //Check vaccination correctness
    const txn3 = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.checkVaccination();
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn3.send().wait();
  });
});
