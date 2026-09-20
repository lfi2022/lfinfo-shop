import 'dotenv/config';

import {
  bootstrapWorker,
  RequestContextService,
  UserService,
  ChannelService,
  LanguageCode,
} from '@vendure/core';

import { config } from '../src/vendure-config';

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();

  if (!email) {
    console.error('Usage: npx tsx scripts/verify-customer.ts client@example.com');
    process.exit(1);
  }

  console.log(`Recherche du compte : ${email}`);

  const worker = await bootstrapWorker(config);
  const app = worker.app;

  try {
    const userService = app.get(UserService);
    const requestContextService = app.get(RequestContextService);
    const channelService = app.get(ChannelService);

    const channel = await channelService.getDefaultChannel();

    const ctx = await requestContextService.create({
      apiType: 'admin',
      channelOrToken: channel,
      languageCode: LanguageCode.fr,
    });

    const user = await userService.getUserByEmailAddress(
      ctx,
      email,
      'customer',
    );

    if (!user) {
      console.error(`❌ Aucun utilisateur client trouvé pour ${email}`);
      process.exitCode = 2;
      return;
    }

    console.log(`User ID : ${user.id}`);
    console.log(`Identifiant : ${user.identifier}`);
    console.log(`Déjà vérifié : ${user.verified ? 'oui' : 'non'}`);

    if (user.verified) {
      console.log('✅ Le compte est déjà vérifié.');
      return;
    }

    const userWithToken = await userService.setVerificationToken(ctx, user);

    const nativeAuth = userWithToken.getNativeAuthenticationMethod();

    if (!nativeAuth.verificationToken) {
      throw new Error(
        'Vendure n’a pas généré de verificationToken pour cet utilisateur.',
      );
    }

    const result = await userService.verifyUserByToken(
      ctx,
      nativeAuth.verificationToken,
    );

    if ('errorCode' in result) {
      console.error(`❌ ${result.errorCode}: ${result.message}`);
      process.exitCode = 3;
      return;
    }

    console.log('✅ Compte validé manuellement avec succès.');
    console.log(`Utilisateur : ${result.identifier}`);
    console.log(`Verified : ${result.verified}`);
  } finally {
    await app.close();
  }
}

main().catch(err => {
  console.error('❌ Erreur :');
  console.error(err);
  process.exit(1);
});
