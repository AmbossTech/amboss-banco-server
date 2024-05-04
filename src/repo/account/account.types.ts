export type NewAccountType = {
  email: string;
  master_password_hash: string;
  password_hint: string;
  symmetric_key_iv: string;
  protected_symmetric_key: string;
  key_pair: {
    public_key: string;
    protected_private_key: string;
  };
};
