import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import mjml2html from 'mjml';
import Handlebars from 'handlebars';
import nodemailer from 'nodemailer';

const TO = 'mrska68@gmail.com';

const BASE = path.join(
  process.cwd(),
  'static/email/templates',
);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    servername: process.env.SMTP_TLS_SERVERNAME,
  },
});

function read(file: string) {
  return fs.readFileSync(file, 'utf8');
}

function renderTemplate(
  templateDir: string,
  variables: Record<string, any>,
) {
  const header = read(path.join(BASE, 'partials/header.hbs'));
  const footer = read(path.join(BASE, 'partials/footer.hbs'));
  const body = read(path.join(BASE, templateDir, 'body.hbs'));

  const source = header + body + footer;

  const hbs = Handlebars.compile(source);

  const mjml = hbs(variables);

  const result = mjml2html(mjml, {
    validationLevel: 'soft',
  });

  if (result.errors?.length) {
    console.log(`⚠️ Erreurs MJML pour ${templateDir}:`);
    console.dir(result.errors, { depth: null });
  }

  return result.html;
}

async function send(
  subject: string,
  templateDir: string,
  variables: Record<string, any>,
) {
  const html = renderTemplate(templateDir, variables);

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM ?? 'LFINFO <shop@lfinfo.be>',
    to: TO,
    subject,
    html,
  });

  console.log(`✅ ${subject}`);
  console.log(`   Message ID: ${info.messageId}`);
}

async function main() {
  await transporter.verify();

  console.log('✅ SMTP OK\n');

  await send(
    '[TEST] Vérification de compte LFINFO',
    'email-verification',
    {
      title: 'Vérifiez votre adresse e-mail',
      verificationUrl:
        'https://shop.lfinfo.be/verify-email?token=TEST-TOKEN',
      customer: {
        firstName: 'Florian',
        lastName: 'Lambert',
        emailAddress: TO,
      },
    },
  );

  await send(
    '[TEST] Réinitialisation du mot de passe LFINFO',
    'password-reset',
    {
      title: 'Réinitialisation du mot de passe',
      passwordResetUrl:
        'https://shop.lfinfo.be/reset-password?token=TEST-TOKEN',
      customer: {
        firstName: 'Florian',
        lastName: 'Lambert',
        emailAddress: TO,
      },
    },
  );

  await send(
    '[TEST] Changement d’adresse e-mail LFINFO',
    'email-address-change',
    {
      title: 'Confirmez votre nouvelle adresse e-mail',
      changeEmailAddressUrl:
        'https://shop.lfinfo.be/verify-email-change?token=TEST-TOKEN',
      customer: {
        firstName: 'Florian',
        lastName: 'Lambert',
        emailAddress: TO,
      },
      newEmailAddress: 'nouvelle-adresse@example.com',
    },
  );

  await send(
    '[TEST] Confirmation de commande LFINFO',
    'order-confirmation',
    {
      title: 'Confirmation de votre commande',
      order: {
        code: 'LF-TEST-2026-0001',
        orderPlacedAt: new Date(),
        customer: {
          firstName: 'Florian',
          lastName: 'Lambert',
          emailAddress: TO,
        },
        lines: [
          {
            productVariant: {
              name: '1 PC / 1 an',
              product: {
                name: 'Bitdefender Antivirus Plus',
              },
            },
            quantity: 1,
            linePriceWithTax: 3995,
          },
          {
            productVariant: {
              name: '1 licence',
              product: {
                name: 'WinRAR',
              },
            },
            quantity: 1,
            linePriceWithTax: 2999,
          },
        ],
        subTotalWithTax: 6994,
        shippingWithTax: 0,
        totalWithTax: 6994,
        discounts: [],
      },
    },
  );

  console.log('\n✅ Tous les e-mails de test ont été envoyés.');
}

main().catch(err => {
  console.error('\n❌ Erreur :');
  console.error(err);
  process.exit(1);
});
