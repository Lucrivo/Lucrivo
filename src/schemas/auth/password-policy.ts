const passwordPolicy = {
  minLength: 10,
  maxLength: 72,
} as const;

type PasswordRequirementState = {
  validLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
};

function evaluatePasswordRequirements(
  password: string,
): PasswordRequirementState {
  return {
    validLength:
      password.length >= passwordPolicy.minLength &&
      password.length <= passwordPolicy.maxLength,
    hasLetter: /\p{L}/u.test(password),
    hasNumber: /[0-9]/.test(password),
  };
}

export {
  evaluatePasswordRequirements,
  passwordPolicy,
  type PasswordRequirementState,
};
