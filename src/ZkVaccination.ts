import {
  Field,
  SmartContract,
  state,
  State,
  method,
  PrivateKey,
  PublicKey,
  isReady,
  Encoding,
  UInt64,
  DeployArgs,
  Permissions,
} from 'snarkyjs';

export { isReady, Field, Encoding };

// Wait till our SnarkyJS instance is ready
await isReady;

// These private keys are exported so that experimenting with the contract is
// easy. Three of them (the Bobs) are used when the contract is deployed to
// generate the public keys that are allowed to post new messages. Jack's key
// is never added to the contract. So he won't be able to add new messages. In
// real life, we would only use the Bobs' public keys to configure the contract,
// and only they would know their private keys.

export const users = {
  issuer: PrivateKey.fromBase58(
    'EKFAdBGSSXrBbaCVqy4YjwWHoGEnsqYRQTqz227Eb5bzMx2bWu3F'
  ),
};

export class ZkVaccination extends SmartContract {
  // On-chain state definitions
  @state(PublicKey) issuer = State<PublicKey>();
  @state(PublicKey) verifier = State<PublicKey>();
  @state(PublicKey) user = State<PublicKey>();
  @state(Field) vaccinationCount = State<Field>();
  @state(UInt64) lastVaccinationTime = State<UInt64>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
  }

  @method init() {
    // Define initial values of on-chain state
    this.issuer.set(users['issuer'].toPublicKey());
    this.vaccinationCount.set(Field.zero);
    this.lastVaccinationTime.set(UInt64.zero);
  }

  @method addVaccination(signerPrivateKey: PrivateKey) {
    const issuer = this.issuer.get();
    this.issuer.assertEquals(this.issuer.get());
    // Check signer is a certified entity
    const signerPublicKey = signerPrivateKey.toPublicKey();
    signerPublicKey.equals(issuer).assertEquals(true);
    // TODO: handle more than one user
    //Update vaccination count
    const vaccinationCount = this.vaccinationCount.get();
    this.vaccinationCount.assertEquals(this.vaccinationCount.get());
    this.vaccinationCount.set(vaccinationCount.add(1));
    //Update vaccination timestamp
    const timestamp = this.network.timestamp.get();
    this.network.timestamp.assertEquals(this.network.timestamp.get());
    this.lastVaccinationTime.set(timestamp);
  }

  @method checkVaccination() {
    // Check has more than 2 vaccination and last vaccination is less than 9 months ago
    const vaccinationCount = this.vaccinationCount.get();
    this.vaccinationCount.assertEquals(this.vaccinationCount.get());
    vaccinationCount.assertGt(1);
    const expirationTime = this.lastVaccinationTime.get();
    const lastVaccinationTime = this.lastVaccinationTime.get();
    this.lastVaccinationTime.assertEquals(this.lastVaccinationTime.get());
    this.network.timestamp.assertBetween(
      lastVaccinationTime,
      expirationTime.add(23668200000)
    );
  }
}
