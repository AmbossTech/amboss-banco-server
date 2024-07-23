export type Secp256k1KeyPairType = {
  public_key: string;
  protected_private_key: string;
};

export type NewAccountType = {
  email: string;
  master_password_hash: string;
  password_hint: string;
  protected_symmetric_key: string;
  secp256k1_key_pair: Secp256k1KeyPairType;
};

export type ChangePasswordType = {
  account_id: string;
  master_password_hash: string;
  protected_symmetric_key: string;
  password_hint?: string;
};
