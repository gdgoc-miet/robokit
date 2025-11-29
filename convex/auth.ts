import GitHub from '@auth/core/providers/github';
import {Password} from '@convex-dev/auth/providers/Password';
import {convexAuth} from '@convex-dev/auth/server';

import {DataModel} from './_generated/dataModel';
import {ResendOTP, ResendOTPPasswordReset} from './ResendOTP';

// Custom Password provider with email verification and password reset
const CustomPassword = Password<DataModel>({
  // Collect name during signup
  profile(params) {
    return {
      email: params.email as string,
      name: (params.name as string) || undefined,
    };
  },
  // Enable email verification (optional - remove if not using Resend)
  // verify: ResendOTP,
  // Enable password reset (optional - remove if not using Resend)
  // reset: ResendOTPPasswordReset,
});

export const {auth, signIn, signOut, store, isAuthenticated} = convexAuth({
  providers: [
    CustomPassword,
    GitHub,
  ],
});
