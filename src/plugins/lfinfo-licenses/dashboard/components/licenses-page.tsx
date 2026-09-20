import {
  api,
  Badge,
  Button,
  Input,
  toast,
  useMutation,
  useQuery,
} from '@vendure/dashboard';

import {
  graphql,
} from '@/gql';

import {
  useMemo,
  useState,
} from 'react';


const licensesQuery = graphql(`
  query LfinfoGlobalLicenses {
    lfinfoLicenses {
      totalItems

      items {
        id

        orderCode

        customerFirstName
        customerLastName
        customerEmail

        productName
        variantName

        licenseKey

        status

        activatedAt
        expiresAt
        durationMonths

        renewalStatus
        renewalProductVariantId

        renewalReminder30SentAt
        renewalReminder10SentAt
        renewalReminder3SentAt
      }
    }
  }
`);


const updateLicenseMutation = graphql(`
  mutation LfinfoGlobalUpdateLicense(
    $input: UpdateOrderLicenseInput!
  ) {
    lfinfoUpdateOrderLicense(
      input: $input
    ) {
      id

      activatedAt
      expiresAt
      durationMonths

      renewalStatus
      renewalProductVariantId

      renewalReminder30SentAt
      renewalReminder10SentAt
      renewalReminder3SentAt
    }
  }
`);


const sendReminderMutation = graphql(`
  mutation LfinfoGlobalSendLicenseReminder(
    $licenseId: ID!
    $reminderType: LicenseReminderType!
  ) {
    lfinfoSendLicenseReminder(
      licenseId: $licenseId
      reminderType: $reminderType
    ) {
      id
    }
  }
`);


const resetRemindersMutation = graphql(`
  mutation LfinfoGlobalResetLicenseReminders(
    $licenseId: ID!
  ) {
    lfinfoResetLicenseReminders(
      licenseId: $licenseId
    ) {
      id

      renewalReminder30SentAt
      renewalReminder10SentAt
      renewalReminder3SentAt
    }
  }
`);


type FilterType =
  | 'ALL'
  | 'ACTIVE'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'NO_EXPIRATION';


type RenewalStatus =
  | 'NONE'
  | 'AVAILABLE'
  | 'PENDING'
  | 'RENEWED'
  | 'EXPIRED';


type ReminderType =
  | 'AUTO'
  | 'DAYS_30'
  | 'DAYS_10'
  | 'DAYS_3';


interface LicenseDraft {
  activatedAt: string;
  expiresAt: string;
  durationMonths: string;

  renewalStatus:
    RenewalStatus;

  renewalProductVariantId:
    string;

  reminderType:
    ReminderType;
}


export function LicensesPage() {

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    filter,
    setFilter,
  ] =
    useState<FilterType>(
      'ALL',
    );

  const [
    editingId,
    setEditingId,
  ] =
    useState<
      string | null
    >(null);

  const [
    draft,
    setDraft,
  ] =
    useState<
      LicenseDraft | null
    >(null);


  const query =
    useQuery({
      queryKey: [
        'lfinfo-global-licenses',
      ],

      queryFn: () =>
        api.query(
          licensesQuery,
          {},
        ),
    });


  const updateMutation =
    useMutation({
      mutationFn:
        (
          variables:
            Parameters<
              typeof api.mutate
            >[1],
        ) =>
          api.mutate(
            updateLicenseMutation,
            variables as any,
          ),
    });


  const reminderMutation =
    useMutation({
      mutationFn:
        (
          variables:
            Parameters<
              typeof api.mutate
            >[1],
        ) =>
          api.mutate(
            sendReminderMutation,
            variables as any,
          ),
    });


  const resetMutation =
    useMutation({
      mutationFn:
        (
          variables:
            Parameters<
              typeof api.mutate
            >[1],
        ) =>
          api.mutate(
            resetRemindersMutation,
            variables as any,
          ),
    });


  const licenses =
    query.data
      ?.lfinfoLicenses
      ?.items ??
    [];


  const filtered =
    useMemo(
      () => {

        const now =
          new Date();

        const thirtyDays =
          30 *
          24 *
          60 *
          60 *
          1000;

        const value =
          search
            .trim()
            .toLowerCase();


        return licenses.filter(
          license => {

            if (value) {

              const searchable = [
                license.orderCode,

                license.customerFirstName,
                license.customerLastName,
                license.customerEmail,

                license.productName,
                license.variantName,

                license.licenseKey,
              ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

              if (
                !searchable.includes(
                  value,
                )
              ) {
                return false;
              }
            }


            const expiresAt =
              license.expiresAt
                ? new Date(
                    license.expiresAt,
                  )
                : null;


            switch (filter) {

              case 'ACTIVE':

                return (
                  expiresAt !== null &&
                  expiresAt >
                    now &&
                  license
                    .renewalStatus !==
                    'EXPIRED'
                );


              case 'EXPIRING':

                if (!expiresAt) {
                  return false;
                }

                return (
                  expiresAt >
                    now &&
                  expiresAt.getTime() -
                    now.getTime() <=
                    thirtyDays
                );


              case 'EXPIRED':

                return (
                  license
                    .renewalStatus ===
                    'EXPIRED' ||
                  (
                    expiresAt !==
                      null &&
                    expiresAt <= now
                  )
                );


              case 'NO_EXPIRATION':

                return (
                  !expiresAt
                );


              case 'ALL':

              default:

                return true;
            }
          },
        );
      },
      [
        licenses,
        search,
        filter,
      ],
    );


  function startEdit(
    license:
      (typeof licenses)[number],
  ) {

    setEditingId(
      String(
        license.id,
      ),
    );

    setDraft({
      activatedAt:
        toDateInput(
          license.activatedAt,
        ),

      expiresAt:
        toDateInput(
          license.expiresAt,
        ),

      durationMonths:
        license.durationMonths !==
          null &&
        license.durationMonths !==
          undefined
          ? String(
              license.durationMonths,
            )
          : '',

      renewalStatus:
        license
          .renewalStatus as
          RenewalStatus,

      renewalProductVariantId:
        license
          .renewalProductVariantId
          ? String(
              license
                .renewalProductVariantId,
            )
          : '',

      reminderType:
        'AUTO',
    });
  }


  function cancelEdit() {

    setEditingId(
      null,
    );

    setDraft(
      null,
    );
  }


  async function saveLicense(
    licenseId:
      string,
  ) {

    if (!draft) {
      return;
    }


    const durationMonths =
      draft.durationMonths
        .trim() === ''
        ? null
        : Number(
            draft.durationMonths,
          );


    if (
      durationMonths !==
        null &&
      (
        !Number.isInteger(
          durationMonths,
        ) ||
        durationMonths < 0
      )
    ) {

      toast.error(
        'La durée doit être un nombre entier positif.',
      );

      return;
    }


    try {

      await updateMutation.mutateAsync({
        input: {
          id:
            licenseId,

          activatedAt:
            draft
              .activatedAt
              ? dateInputToIso(
                  draft
                    .activatedAt,
                )
              : null,

          expiresAt:
            draft
              .expiresAt
              ? dateInputToIso(
                  draft
                    .expiresAt,
                )
              : null,

          durationMonths,

          renewalStatus:
            draft
              .renewalStatus,

          renewalProductVariantId:
            draft
              .renewalProductVariantId
              .trim() ||
            null,
        },
      } as any);


      toast.success(
        'Licence mise à jour.',
      );

      cancelEdit();

      await query.refetch();

    } catch (
      error
    ) {

      console.error(
        error,
      );

      toast.error(
        'Impossible de mettre à jour la licence.',
      );
    }
  }


  async function sendReminder(
    licenseId:
      string,
  ) {

    if (!draft) {
      return;
    }


    try {

      await reminderMutation
        .mutateAsync({
          licenseId,

          reminderType:
            draft.reminderType,
        } as any);


      toast.success(
        'E-mail de rappel envoyé.',
      );

      await query.refetch();

    } catch (
      error
    ) {

      console.error(
        error,
      );

      toast.error(
        'Impossible d’envoyer le rappel.',
      );
    }
  }


  async function resetReminders(
    licenseId:
      string,
  ) {

    const confirmed =
      window.confirm(
        'Réinitialiser les rappels J-30, J-10 et J-3 de cette licence ?',
      );

    if (!confirmed) {
      return;
    }


    try {

      await resetMutation
        .mutateAsync({
          licenseId,
        } as any);


      toast.success(
        'Historique des rappels réinitialisé.',
      );

      await query.refetch();

    } catch (
      error
    ) {

      console.error(
        error,
      );

      toast.error(
        'Impossible de réinitialiser les rappels.',
      );
    }
  }


  if (
    query.isLoading
  ) {

    return (
      <div className="p-6">
        Chargement des licences…
      </div>
    );
  }


  if (
    query.error
  ) {

    return (
      <div className="p-6">
        Impossible de charger les licences.
      </div>
    );
  }


  return (

    <div className="p-6 space-y-6">

      <div
        className="
          flex
          flex-wrap
          items-center
          justify-between
          gap-4
        "
      >

        <div>

          <h1
            className="
              text-2xl
              font-semibold
            "
          >
            Licences
          </h1>

          <p
            className="
              text-sm
              text-muted-foreground
            "
          >
            {
              licenses.length
            } licence(s)
          </p>

        </div>


        <Button
          variant="outline"
          onClick={() =>
            query.refetch()
          }
        >
          Actualiser
        </Button>

      </div>


      <div
        className="
          flex
          flex-wrap
          gap-2
        "
      >

        <FilterButton
          active={
            filter ===
            'ALL'
          }
          onClick={() =>
            setFilter(
              'ALL',
            )
          }
        >
          Toutes
        </FilterButton>


        <FilterButton
          active={
            filter ===
            'ACTIVE'
          }
          onClick={() =>
            setFilter(
              'ACTIVE',
            )
          }
        >
          Actives
        </FilterButton>


        <FilterButton
          active={
            filter ===
            'EXPIRING'
          }
          onClick={() =>
            setFilter(
              'EXPIRING',
            )
          }
        >
          Expire &lt; 30 jours
        </FilterButton>


        <FilterButton
          active={
            filter ===
            'EXPIRED'
          }
          onClick={() =>
            setFilter(
              'EXPIRED',
            )
          }
        >
          Expirées
        </FilterButton>


        <FilterButton
          active={
            filter ===
            'NO_EXPIRATION'
          }
          onClick={() =>
            setFilter(
              'NO_EXPIRATION',
            )
          }
        >
          Sans expiration
        </FilterButton>

      </div>


      <Input
        placeholder="Rechercher client, commande, produit, variante ou clé…"
        value={search}
        onChange={
          event =>
            setSearch(
              event.target.value,
            )
        }
      />


      <div
        className="
          overflow-x-auto
          rounded-lg
          border
        "
      >

        <table
          className="
            w-full
            text-sm
          "
        >

          <thead>

            <tr
              className="
                border-b
                bg-muted/40
                text-left
              "
            >

              <th className="p-3">
                Client
              </th>

              <th className="p-3">
                Commande
              </th>

              <th className="p-3">
                Produit
              </th>

              <th className="p-3">
                Licence
              </th>

              <th className="p-3">
                Activation
              </th>

              <th className="p-3">
                Expiration
              </th>

              <th className="p-3">
                Livraison
              </th>

              <th className="p-3">
                Renouvellement
              </th>

              <th className="p-3">
                Rappels
              </th>

              <th className="p-3">
                Actions
              </th>

            </tr>

          </thead>


          <tbody>

            {
              filtered.map(
                license => {

                  const isEditing =
                    editingId ===
                    String(
                      license.id,
                    );


                  return (
                    <>
                      <tr
                        key={
                          String(
                            license.id,
                          )
                        }
                        className="
                          border-b
                        "
                      >

                        <td className="p-3">

                          <div
                            className="
                              font-medium
                            "
                          >
                            {
                              [
                                license
                                  .customerFirstName,

                                license
                                  .customerLastName,
                              ]
                                .filter(
                                  Boolean,
                                )
                                .join(
                                  ' ',
                                ) ||
                              '—'
                            }
                          </div>

                          <div
                            className="
                              text-xs
                              text-muted-foreground
                            "
                          >
                            {
                              license
                                .customerEmail ||
                              '—'
                            }
                          </div>

                        </td>


                        <td className="p-3">

                          {
                            license
                              .orderCode ||
                            '—'
                          }

                        </td>


                        <td className="p-3">

                          <div>
                            {
                              license
                                .productName
                            }
                          </div>

                          <div
                            className="
                              text-xs
                              text-muted-foreground
                            "
                          >
                            {
                              license
                                .variantName
                            }
                          </div>

                        </td>


                        <td
                          className="
                            p-3
                            font-mono
                          "
                        >

                          {
                            maskKey(
                              license
                                .licenseKey,
                            )
                          }

                        </td>


                        <td className="p-3">

                          {
                            formatDate(
                              license
                                .activatedAt,
                            )
                          }

                        </td>


                        <td className="p-3">

                          <ExpirationDisplay
                            value={
                              license
                                .expiresAt
                            }
                          />

                        </td>


                        <td className="p-3">

                          <Badge>
                            {
                              license
                                .status
                            }
                          </Badge>

                        </td>


                        <td className="p-3">

                          <Badge>
                            {
                              license
                                .renewalStatus
                            }
                          </Badge>

                        </td>


                        <td className="p-3">

                          <ReminderStatus
                            label="J-30"
                            value={
                              license
                                .renewalReminder30SentAt
                            }
                          />

                          <ReminderStatus
                            label="J-10"
                            value={
                              license
                                .renewalReminder10SentAt
                            }
                          />

                          <ReminderStatus
                            label="J-3"
                            value={
                              license
                                .renewalReminder3SentAt
                            }
                          />

                        </td>


                        <td className="p-3">

                          <Button
                            variant="outline"
                            onClick={() => {

                              if (
                                isEditing
                              ) {
                                cancelEdit();

                                return;
                              }

                              startEdit(
                                license,
                              );
                            }}
                          >
                            {
                              isEditing
                                ? 'Fermer'
                                : 'Modifier'
                            }
                          </Button>

                        </td>

                      </tr>


                      {
                        isEditing &&
                        draft && (

                          <tr
                            key={
                              `${license.id}-editor`
                            }
                            className="
                              border-b
                              bg-muted/20
                            "
                          >

                            <td
                              colSpan={10}
                              className="p-5"
                            >

                              <div
                                className="
                                  space-y-5
                                "
                              >

                                <div>

                                  <h3
                                    className="
                                      text-base
                                      font-semibold
                                    "
                                  >
                                    Gestion de la licence
                                  </h3>

                                  <p
                                    className="
                                      text-sm
                                      text-muted-foreground
                                    "
                                  >
                                    {
                                      license
                                        .productName
                                    }
                                    {' — '}
                                    {
                                      license
                                        .orderCode
                                    }
                                  </p>

                                </div>


                                <div
                                  className="
                                    grid
                                    grid-cols-1
                                    gap-4
                                    md:grid-cols-2
                                    xl:grid-cols-5
                                  "
                                >

                                  <Field
                                    label="Date d’activation"
                                  >

                                    <Input
                                      type="date"
                                      value={
                                        draft
                                          .activatedAt
                                      }
                                      onChange={
                                        event =>
                                          setDraft({
                                            ...draft,

                                            activatedAt:
                                              event
                                                .target
                                                .value,
                                          })
                                      }
                                    />

                                  </Field>


                                  <Field
                                    label="Date d’expiration"
                                  >

                                    <Input
                                      type="date"
                                      value={
                                        draft
                                          .expiresAt
                                      }
                                      onChange={
                                        event =>
                                          setDraft({
                                            ...draft,

                                            expiresAt:
                                              event
                                                .target
                                                .value,
                                          })
                                      }
                                    />

                                  </Field>


                                  <Field
                                    label="Durée (mois)"
                                  >

                                    <Input
                                      type="number"
                                      min="0"
                                      step="1"
                                      placeholder="12"
                                      value={
                                        draft
                                          .durationMonths
                                      }
                                      onChange={
                                        event =>
                                          setDraft({
                                            ...draft,

                                            durationMonths:
                                              event
                                                .target
                                                .value,
                                          })
                                      }
                                    />

                                  </Field>


                                  <Field
                                    label="Statut renouvellement"
                                  >

                                    <select
                                      className="
                                        h-9
                                        w-full
                                        rounded-md
                                        border
                                        bg-background
                                        px-3
                                        text-sm
                                      "
                                      value={
                                        draft
                                          .renewalStatus
                                      }
                                      onChange={
                                        event =>
                                          setDraft({
                                            ...draft,

                                            renewalStatus:
                                              event
                                                .target
                                                .value as
                                                RenewalStatus,
                                          })
                                      }
                                    >

                                      <option value="NONE">
                                        Aucun
                                      </option>

                                      <option value="AVAILABLE">
                                        Disponible
                                      </option>

                                      <option value="PENDING">
                                        En cours
                                      </option>

                                      <option value="RENEWED">
                                        Renouvelée
                                      </option>

                                      <option value="EXPIRED">
                                        Expirée
                                      </option>

                                    </select>

                                  </Field>


                                  <Field
                                    label="ID variante renouvellement"
                                  >

                                    <Input
                                      placeholder="Ex. 42"
                                      value={
                                        draft
                                          .renewalProductVariantId
                                      }
                                      onChange={
                                        event =>
                                          setDraft({
                                            ...draft,

                                            renewalProductVariantId:
                                              event
                                                .target
                                                .value,
                                          })
                                      }
                                    />

                                  </Field>

                                </div>


                                <div
                                  className="
                                    flex
                                    flex-wrap
                                    gap-2
                                  "
                                >

                                  <Button
                                    onClick={() =>
                                      saveLicense(
                                        String(
                                          license.id,
                                        ),
                                      )
                                    }
                                    disabled={
                                      updateMutation
                                        .isPending
                                    }
                                  >
                                    Enregistrer
                                  </Button>


                                  <Button
                                    variant="outline"
                                    onClick={
                                      cancelEdit
                                    }
                                  >
                                    Annuler
                                  </Button>

                                </div>


                                <div
                                  className="
                                    border-t
                                    pt-5
                                  "
                                >

                                  <h4
                                    className="
                                      mb-3
                                      font-semibold
                                    "
                                  >
                                    Rappels de renouvellement
                                  </h4>


                                  <div
                                    className="
                                      grid
                                      grid-cols-1
                                      gap-4
                                      lg:grid-cols-2
                                    "
                                  >

                                    <div
                                      className="
                                        space-y-3
                                      "
                                    >

                                      <Field
                                        label="Type de rappel manuel"
                                      >

                                        <select
                                          className="
                                            h-9
                                            w-full
                                            rounded-md
                                            border
                                            bg-background
                                            px-3
                                            text-sm
                                          "
                                          value={
                                            draft
                                              .reminderType
                                          }
                                          onChange={
                                            event =>
                                              setDraft({
                                                ...draft,

                                                reminderType:
                                                  event
                                                    .target
                                                    .value as
                                                    ReminderType,
                                              })
                                          }
                                        >

                                          <option value="AUTO">
                                            Automatique selon expiration
                                          </option>

                                          <option value="DAYS_30">
                                            J-30
                                          </option>

                                          <option value="DAYS_10">
                                            J-10
                                          </option>

                                          <option value="DAYS_3">
                                            J-3
                                          </option>

                                        </select>

                                      </Field>


                                      <Button
                                        onClick={() =>
                                          sendReminder(
                                            String(
                                              license.id,
                                            ),
                                          )
                                        }
                                        disabled={
                                          reminderMutation
                                            .isPending
                                        }
                                      >
                                        Envoyer le rappel maintenant
                                      </Button>

                                    </div>


                                    <div
                                      className="
                                        rounded-md
                                        border
                                        p-4
                                        space-y-2
                                      "
                                    >

                                      <ReminderStatus
                                        label="J-30"
                                        value={
                                          license
                                            .renewalReminder30SentAt
                                        }
                                        detailed
                                      />

                                      <ReminderStatus
                                        label="J-10"
                                        value={
                                          license
                                            .renewalReminder10SentAt
                                        }
                                        detailed
                                      />

                                      <ReminderStatus
                                        label="J-3"
                                        value={
                                          license
                                            .renewalReminder3SentAt
                                        }
                                        detailed
                                      />


                                      <div
                                        className="
                                          pt-2
                                        "
                                      >

                                        <Button
                                          variant="outline"
                                          onClick={() =>
                                            resetReminders(
                                              String(
                                                license.id,
                                              ),
                                            )
                                          }
                                          disabled={
                                            resetMutation
                                              .isPending
                                          }
                                        >
                                          Réinitialiser les rappels
                                        </Button>

                                      </div>

                                    </div>

                                  </div>

                                </div>

                              </div>

                            </td>

                          </tr>
                        )
                      }

                    </>
                  );
                },
              )
            }


            {
              filtered.length ===
                0 && (

                <tr>

                  <td
                    colSpan={10}
                    className="
                      p-8
                      text-center
                      text-muted-foreground
                    "
                  >
                    Aucune licence trouvée.
                  </td>

                </tr>
              )
            }

          </tbody>

        </table>

      </div>

    </div>
  );
}


function Field({
  label,
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {

  return (

    <label
      className="
        space-y-1.5
        block
      "
    >

      <span
        className="
          text-sm
          font-medium
        "
      >
        {label}
      </span>

      {children}

    </label>
  );
}


function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick:
    () => void;
  children:
    React.ReactNode;
}) {

  return (

    <Button
      variant={
        active
          ? 'default'
          : 'outline'
      }
      onClick={
        onClick
      }
    >
      {children}
    </Button>
  );
}


function ReminderStatus({
  label,
  value,
  detailed = false,
}: {
  label: string;
  value:
    string |
    null |
    undefined;
  detailed?:
    boolean;
}) {

  return (

    <div
      className="
        flex
        items-center
        gap-2
        text-xs
      "
    >

      <span
        className="
          font-medium
        "
      >
        {label}
      </span>

      {
        value
          ? (
            <span>
              ✓
              {
                detailed
                  ? ` ${formatDateTime(value)}`
                  : ''
              }
            </span>
          )
          : (
            <span
              className="
                text-muted-foreground
              "
            >
              —
            </span>
          )
      }

    </div>
  );
}


function ExpirationDisplay({
  value,
}: {
  value:
    string |
    null |
    undefined;
}) {

  if (!value) {

    return (
      <span>
        —
      </span>
    );
  }


  const expiration =
    new Date(
      value,
    );

  const now =
    new Date();

  const days =
    Math.ceil(
      (
        expiration.getTime() -
        now.getTime()
      ) /
      (
        1000 *
        60 *
        60 *
        24
      ),
    );


  return (

    <div>

      <div>
        {
          formatDate(
            value,
          )
        }
      </div>

      <div
        className="
          text-xs
          text-muted-foreground
        "
      >

        {
          days < 0
            ? `Expirée depuis ${Math.abs(days)} j`
            : days === 0
              ? 'Expire aujourd’hui'
              : `${days} jour(s)`
        }

      </div>

    </div>
  );
}


function formatDate(
  value:
    string |
    null |
    undefined,
): string {

  if (!value) {
    return '—';
  }


  return new Intl
    .DateTimeFormat(
      'fr-BE',
      {
        day:
          '2-digit',

        month:
          '2-digit',

        year:
          'numeric',
      },
    )
    .format(
      new Date(
        value,
      ),
    );
}


function formatDateTime(
  value:
    string,
): string {

  return new Intl
    .DateTimeFormat(
      'fr-BE',
      {
        day:
          '2-digit',

        month:
          '2-digit',

        year:
          'numeric',

        hour:
          '2-digit',

        minute:
          '2-digit',
      },
    )
    .format(
      new Date(
        value,
      ),
    );
}


function toDateInput(
  value:
    string |
    null |
    undefined,
): string {

  if (!value) {
    return '';
  }


  const date =
    new Date(
      value,
    );


  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
      1,
    )
      .padStart(
        2,
        '0',
      );

  const day =
    String(
      date.getDate(),
    )
      .padStart(
        2,
        '0',
      );


  return (
    `${year}-${month}-${day}`
  );
}


function dateInputToIso(
  value:
    string,
): string {

  return new Date(
    `${value}T12:00:00`,
  )
    .toISOString();
}


function maskKey(
  value:
    string |
    null |
    undefined,
): string {

  if (!value) {
    return '—';
  }


  if (
    value.length <=
    4
  ) {
    return '••••';
  }


  return (
    `••••••${value.slice(-4)}`
  );
}
