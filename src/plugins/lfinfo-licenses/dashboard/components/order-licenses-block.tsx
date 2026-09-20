import {
  api,
  Badge,
  Button,
  Input,
  Label,
  Textarea,
  toast,
  useMutation,
  useQuery,
  useQueryClient,
} from '@vendure/dashboard';

import { graphql } from '@/gql';

import { useState } from 'react';

const getLicensesDocument = graphql(`
  query LfinfoDashboardOrderLicenses($orderId: ID!) {
    lfinfoOrderLicenses(orderId: $orderId) {
      id
      orderId
      orderLineId
      productVariantId

      licenseIndex

      productName
      variantName

      licenseKey
      activationUrl
      downloadUrl
      instructions

      status
      deliveredAt
    }
  }
`);

const syncLicensesDocument = graphql(`
  mutation LfinfoDashboardSyncOrderLicenses($orderId: ID!) {
    lfinfoSyncOrderLicenses(orderId: $orderId) {
      id
      status
    }
  }
`);

const updateLicenseDocument = graphql(`
  mutation LfinfoDashboardUpdateOrderLicense(
    $input: UpdateOrderLicenseInput!
  ) {
    lfinfoUpdateOrderLicense(input: $input) {
      id
      licenseKey
      activationUrl
      downloadUrl
      instructions
      status
      updatedAt
    }
  }
`);

type Props = {
  orderId: string;
};

type LicenseDraft = {
  licenseKey: string;
  activationUrl: string;
  downloadUrl: string;
  instructions: string;
};

export function OrderLicensesBlock({
  orderId,
}: Props) {
  const queryClient = useQueryClient();

  const [drafts, setDrafts] =
    useState<Record<string, LicenseDraft>>({});

  const licensesQuery = useQuery({
    queryKey: [
      'lfinfo-order-licenses',
      orderId,
    ],

    enabled: !!orderId,

    queryFn: () =>
      api.query(
        getLicensesDocument,
        {
          orderId,
        },
      ),
  });

  const syncMutation = useMutation({
    mutationFn: () =>
      api.mutate(
        syncLicensesDocument,
        {
          orderId,
        },
      ),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [
          'lfinfo-order-licenses',
          orderId,
        ],
      });

      toast.success(
        'Emplacements de licences synchronisés',
      );
    },

    onError: error => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erreur de synchronisation',
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      draft,
      status,
    }: {
      id: string;
      draft: LicenseDraft;
      status?: 'PENDING' | 'READY';
    }) =>
      api.mutate(
        updateLicenseDocument,
        {
          input: {
            id,

            licenseKey:
              draft.licenseKey || null,

            activationUrl:
              draft.activationUrl || null,

            downloadUrl:
              draft.downloadUrl || null,

            instructions:
              draft.instructions || null,

            ...(status
              ? { status }
              : {}),
          },
        },
      ),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [
          'lfinfo-order-licenses',
          orderId,
        ],
      });

      toast.success(
        'Licence enregistrée',
      );
    },

    onError: error => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'enregistrement",
      );
    },
  });

  if (!orderId) {
    return null;
  }

  if (licensesQuery.isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        Chargement des licences…
      </div>
    );
  }

  if (licensesQuery.error) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-destructive">
          Impossible de charger les licences.
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            licensesQuery.refetch()
          }
        >
          Réessayer
        </Button>
      </div>
    );
  }

  const licenses =
    licensesQuery.data
      ?.lfinfoOrderLicenses ?? [];

  if (licenses.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Aucun emplacement de licence
          n'a encore été créé pour cette
          commande.
        </p>

        <Button
          type="button"
          onClick={() =>
            syncMutation.mutate()
          }
          disabled={
            syncMutation.isPending
          }
        >
          {syncMutation.isPending
            ? 'Synchronisation…'
            : 'Créer les licences'}
        </Button>
      </div>
    );
  }

  const readyCount =
    licenses.filter(
      license =>
        license.status === 'READY' ||
        license.status === 'DELIVERED',
    ).length;

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">
            Provisioning
          </div>

          <div className="text-sm text-muted-foreground">
            {readyCount} / {licenses.length}
            {' '}licence(s) prête(s)
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            syncMutation.mutate()
          }
          disabled={
            syncMutation.isPending
          }
        >
          Synchroniser
        </Button>
      </div>

      {licenses.map(license => {

        const draft =
          drafts[license.id] ?? {
            licenseKey:
              license.licenseKey ?? '',

            activationUrl:
              license.activationUrl ?? '',

            downloadUrl:
              license.downloadUrl ?? '',

            instructions:
              license.instructions ?? '',
          };

        const setField = (
          field: keyof LicenseDraft,
          value: string,
        ) => {
          setDrafts(current => ({
            ...current,

            [license.id]: {
              ...draft,
              [field]: value,
            },
          }));
        };

        const delivered =
          license.status ===
          'DELIVERED';

        return (
          <div
            key={license.id}
            className="
              space-y-4
              border-t
              pt-5
              first:border-t-0
              first:pt-0
            "
          >

            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium">
                  {license.productName}
                </div>

                <div className="text-sm text-muted-foreground">
                  {license.variantName}
                </div>

                <div className="text-xs text-muted-foreground mt-1">
                  Licence #{license.licenseIndex}
                </div>
              </div>

              <Badge
                variant={
                  license.status ===
                  'DELIVERED'
                    ? 'success'
                    : license.status ===
                        'READY'
                      ? 'secondary'
                      : 'outline'
                }
              >
                {license.status}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label>
                Clé de licence
              </Label>

              <Input
                value={
                  draft.licenseKey
                }
                disabled={delivered}
                onChange={event =>
                  setField(
                    'licenseKey',
                    event.target.value,
                  )
                }
                placeholder="XXXX-XXXX-XXXX-XXXX"
              />
            </div>

            <div className="space-y-2">
              <Label>
                URL d'activation
              </Label>

              <Input
                value={
                  draft.activationUrl
                }
                disabled={delivered}
                onChange={event =>
                  setField(
                    'activationUrl',
                    event.target.value,
                  )
                }
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label>
                URL de téléchargement
              </Label>

              <Input
                value={
                  draft.downloadUrl
                }
                disabled={delivered}
                onChange={event =>
                  setField(
                    'downloadUrl',
                    event.target.value,
                  )
                }
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label>
                Instructions
              </Label>

              <Textarea
                value={
                  draft.instructions
                }
                disabled={delivered}
                onChange={event =>
                  setField(
                    'instructions',
                    event.target.value,
                  )
                }
                rows={4}
                placeholder="Instructions d'activation..."
              />
            </div>

            {!delivered && (
              <div className="flex flex-wrap gap-2">

                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    updateMutation.isPending
                  }
                  onClick={() =>
                    updateMutation.mutate({
                      id: license.id,
                      draft,
                    })
                  }
                >
                  Enregistrer
                </Button>

                {license.status !==
                  'READY' && (
                  <Button
                    type="button"
                    disabled={
                      updateMutation.isPending
                    }
                    onClick={() =>
                      updateMutation.mutate({
                        id: license.id,
                        draft,
                        status: 'READY',
                      })
                    }
                  >
                    Marquer prête
                  </Button>
                )}

                {license.status ===
                  'READY' && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      updateMutation.isPending
                    }
                    onClick={() =>
                      updateMutation.mutate({
                        id: license.id,
                        draft,
                        status:
                          'PENDING',
                      })
                    }
                  >
                    Repasser en attente
                  </Button>
                )}
              </div>
            )}

            {delivered && (
              <div className="text-sm text-muted-foreground">
                Licence livrée au client.
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
}
