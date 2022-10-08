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
  verifier: PrivateKey.fromBase58(
    'EKEitxmNYYMCyumtKr8xi1yPpY3Bq6RZTEQsozu2gGf44cNxowmg'
  ),
  user: PrivateKey.fromBase58(
    'EKE9qUDcfqf6Gx9z6CNuuDYPe4XQQPzFBCfduck2X4PeFQJkhXtt'
  ),
};

export const db = {};

export class ZkVaccination extends SmartContract {
  // On-chain state definitions
  @state(PublicKey) issuer = State<PublicKey>();
  @state(PublicKey) verifier = State<PublicKey>();
  @state(PublicKey) user = State<PublicKey>();
  @state(Field) vaccinationCount = State<Field>();
  @state(UInt64) lastVaccinationTime = State<UInt64>();

  @method init() {
    // Define initial values of on-chain state
    this.issuer.set(users['issuer'].toPublicKey());
    this.verifier.set(users['verifier'].toPublicKey());
    this.user.set(users['user'].toPublicKey());
    this.vaccinationCount.set(Field.zero);
    this.lastVaccinationTime.set(UInt64.zero);
  }

  @method addVaccination(
    vaccinatedPublicKey: Field,
    signerPrivateKey: PrivateKey
  ) {
    const issuer = this.issuer.get();
    // Check signer is a certified entity
    const signerPublicKey = signerPrivateKey.toPublicKey();
    signerPublicKey.equals(issuer).assertEquals(true);
    // TODO: handle more than one user
    //Update vaccination count
    this.vaccinationCount.set(this.vaccinationCount.get().add(1));
    //Update vaccination timestamp
    this.lastVaccinationTime.set(this.network.timestamp.get());
  }

  @method checkVaccination() {
    // Check has more than 2 vaccination and last vaccination is less than 9 months ago
    this.vaccinationCount.get().assertGt(1);
    const expirationTime = this.lastVaccinationTime.get();
    this.network.timestamp.assertBetween(
      this.lastVaccinationTime.get(),
      expirationTime.add(23668200000)
    );
  }
}
