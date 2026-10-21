import { api, Button, Input, toast, useMutation, useQuery } from '@vendure/dashboard';
import { graphql } from '@/gql';
import { useState } from 'react';

const catalogueQuery = graphql(`query SupplierCatalogue($input: SupplierSearchInput!) { lfinfoSupplierCatalogue(input: $input) { totalItems isExhaustive source notice items { sku name manufacturer category subCategory manufacturerReference ean priceHt currencyCode recommendedPrice stock localStock incomingStock ramGb ssdGb keyboardLayout status discontinued imported description imageUrl icecatFound icecatTitle } } lfinfoSupplierDiagnostic }`);
const importMutation = graphql(`mutation SupplierImport($items: [SupplierImportItemInput!]!, $marginPercent: Float!, $fixedAmount: Float!, $useRecommendedPrice: Boolean!) { lfinfoSupplierImport(items: $items, marginPercent: $marginPercent, fixedAmount: $fixedAmount, useRecommendedPrice: $useRecommendedPrice) { imported skipped errors } }`);
const defaults = { manufacturer: 'LENOVO', productClass: 'COMPORT', productSubClass: '', reference: '', manufacturerReference: '', ean: '', status: 'Active', text: '', minRamGb: '', minSsdGb: '', keyboardLayout: '', minPurchasePrice: '', maxPurchasePrice: '', availability: 'ALL', take: '50' };
type Filters = typeof defaults;
const selectClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
const labelClass = 'block space-y-1 text-sm';
const asNumber = (value: string) => value.trim() === '' ? null : Number(value);

export function SuppliersPage() {
  const [filters, setFilters] = useState<Filters>(defaults);
  const [request, setRequest] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [margin, setMargin] = useState('15');
  const [fixed, setFixed] = useState('0');
  const [recommended, setRecommended] = useState(false);
  const [diagnostic, setDiagnostic] = useState(false);
  const update = (key: keyof Filters, value: string) => setFilters(f => ({ ...f, [key]: value }));
  const makeRequest = (f: Filters, skip: number) => ({
    supplier: 'TD_SYNNEX', manufacturer: f.manufacturer || null, productClass: f.productClass || null,
    productSubClass: f.productSubClass || null, reference: f.reference || null,
    manufacturerReference: f.manufacturerReference || null, ean: f.ean || null,
    status: f.status || null, text: f.text || null,
    minRamGb: asNumber(f.minRamGb), minSsdGb: asNumber(f.minSsdGb),
    keyboardLayout: f.keyboardLayout || null,
    minPurchasePrice: asNumber(f.minPurchasePrice), maxPurchasePrice: asNumber(f.maxPurchasePrice),
    availability: f.availability, take: Number(f.take), skip,
  });
  const search = useQuery({ queryKey: ['lfinfo-supplier-catalogue', JSON.stringify(request)], enabled: request !== null,
    queryFn: () => api.query(catalogueQuery, { input: request } as any) });
  const importer = useMutation({ mutationFn: (variables: any) => api.mutate(importMutation, variables) });
  const result: any = (search.data as any)?.lfinfoSupplierCatalogue;
  const items: any[] = result?.items ?? [];
  const money = (n: number | null | undefined, currency?: string | null) => n == null ? '—' : `${n.toFixed(2)} ${currency || 'EUR'}`;
  const searchNow = () => { setPage(0); setSelected([]); setRequest(makeRequest(filters, 0)); };
  const changePage = (next: number) => { setPage(next); setSelected([]); setRequest(makeRequest(filters, next * Number(filters.take))); };
  const toggle = (sku: string) => setSelected(current => current.includes(sku) ? current.filter(x => x !== sku) : [...current, sku]);
  const allSelected = items.length > 0 && items.every(p => selected.includes(p.sku));
  async function importSelected() {
    const chosen = items.filter(p => selected.includes(p.sku));
    if (!chosen.length) return toast.error('Sélectionne au moins un produit.');
    const valid = chosen.filter(p => (recommended && p.recommendedPrice > 0) || (!recommended && p.priceHt > 0));
    if (valid.length !== chosen.length) return toast.error('Certains produits n’ont pas de prix valide : retire-les de la sélection.');
    const products = valid.map(p => ({ sku: p.sku, name: p.name, manufacturer: p.manufacturer,
      manufacturerReference: p.manufacturerReference, ean: p.ean, priceHt: p.priceHt,
      recommendedPrice: p.recommendedPrice, stock: p.stock, incomingStock: p.incomingStock,
      discontinued: p.discontinued, description: p.description }));
    try {
      const response: any = await importer.mutateAsync({ items: products, marginPercent: Number(margin), fixedAmount: Number(fixed), useRecommendedPrice: recommended });
      const output = response.lfinfoSupplierImport;
      if (output.errors?.length) toast.error(`${output.imported} importés, ${output.errors.length} erreur(s) : ${output.errors.slice(0, 2).join('; ')}`);
      else toast.success(`${output.imported} produit(s) importé(s) en brouillon.`);
      setSelected([]);
    } catch (e) { toast.error(`Import impossible : ${e instanceof Error ? e.message : 'erreur inconnue'}`); }
  }
  return <div className="p-6 space-y-6">
    <header><h1 className="text-2xl font-semibold">Fournisseurs · Explorateur TD SYNNEX</h1>
      <p className="text-sm text-muted-foreground">Recherche catalogue avec aperçu des photos Icecat avant sélection, prix, stocks et import en brouillon. Les filtres techniques sont facultatifs.</p></header>
    <section className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Filtres de recherche</h2><Button variant="outline" onClick={() => { setFilters({ ...defaults, manufacturer: '', productClass: '', status: '' }); setRequest(null); setSelected([]); }}>Effacer les filtres</Button></div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <label className={labelClass}>Fabricant<Input value={filters.manufacturer} onChange={e => update('manufacturer', e.target.value)} placeholder="LENOVO, HP, BROTHER…" /></label>
        <label className={labelClass}>Classe TD<Input value={filters.productClass} onChange={e => update('productClass', e.target.value)} placeholder="COMPORT" /></label>
        <label className={labelClass}>Sous-classe TD<Input value={filters.productSubClass} onChange={e => update('productSubClass', e.target.value)} placeholder="NOTEBOOKS" /></label>
        <label className={labelClass}>Statut<select className={selectClass} value={filters.status} onChange={e => update('status', e.target.value)}><option value="">Tous</option><option value="Active">Actif</option><option value="Discontinued">Abandonné</option></select></label>
        <label className={labelClass}>Recherche par nom<Input value={filters.text} onChange={e => update('text', e.target.value)} placeholder="IdeaPad, ThinkPad, ProBook…" /></label>
        <label className={labelClass}>Référence TD exacte<Input value={filters.reference} onChange={e => update('reference', e.target.value)} placeholder="Référence TD SYNNEX" /></label>
        <label className={labelClass}>Référence fabricant<Input value={filters.manufacturerReference} onChange={e => update('manufacturerReference', e.target.value)} placeholder="MPN" /></label>
        <label className={labelClass}>EAN / GTIN<Input value={filters.ean} onChange={e => update('ean', e.target.value)} placeholder="Code-barres" /></label>
        <label className={labelClass}>RAM minimale<select className={selectClass} value={filters.minRamGb} onChange={e => update('minRamGb', e.target.value)}><option value="">Indifférent</option>{[8, 16, 24, 32, 64].map(n => <option key={n} value={n}>{n} Go</option>)}</select></label>
        <label className={labelClass}>SSD minimal<select className={selectClass} value={filters.minSsdGb} onChange={e => update('minSsdGb', e.target.value)}><option value="">Indifférent</option>{[256, 512, 1024, 2048].map(n => <option key={n} value={n}>{n >= 1024 ? `${n / 1024} To` : `${n} Go`}</option>)}</select></label>
        <label className={labelClass}>Clavier<select className={selectClass} value={filters.keyboardLayout} onChange={e => update('keyboardLayout', e.target.value)}><option value="">Indifférent</option><option value="BE">Belge</option><option value="FR">Français</option><option value="DE">Allemand</option><option value="OTHER">Autre</option></select></label>
        <label className={labelClass}>Disponibilité<select className={selectClass} value={filters.availability} onChange={e => update('availability', e.target.value)}><option value="ALL">Toutes</option><option value="IN_STOCK">En stock</option><option value="INCOMING">Arrivages</option><option value="UNAVAILABLE">Indisponible</option></select></label>
        <label className={labelClass}>Prix achat min. HT<Input type="number" min="0" value={filters.minPurchasePrice} onChange={e => update('minPurchasePrice', e.target.value)} /></label>
        <label className={labelClass}>Prix achat max. HT<Input type="number" min="0" value={filters.maxPurchasePrice} onChange={e => update('maxPurchasePrice', e.target.value)} /></label>
        <label className={labelClass}>Résultats / page<select className={selectClass} value={filters.take} onChange={e => update('take', e.target.value)}>{[25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      </div>
      <div className="flex gap-2 items-center"><Button onClick={searchNow} disabled={search.isFetching}>{search.isFetching ? 'Recherche…' : 'Rechercher'}</Button><span className="text-xs text-muted-foreground">« IdeaPad » est un filtre texte local, pas un fabricant TD SYNNEX.</span></div>
    </section>
    {search.error && <div className="rounded-md border border-destructive p-3 text-sm text-destructive">Recherche refusée : {search.error instanceof Error ? search.error.message : String(search.error)}</div>}
    {result && <div className="rounded-md border p-3 text-sm"><strong>{items.length}</strong> produit(s) affiché(s) · total annoncé par TD : {result.totalItems} · page {page + 1}<p className="text-muted-foreground">{result.notice}</p></div>}
    <section className="rounded-lg border p-4 space-y-3"><h2 className="font-semibold">Import en brouillon</h2>
      <div className="flex flex-wrap gap-3 items-end"><label className={labelClass}>Majoration sur achat (%)<Input type="number" min="0" max="500" value={margin} onChange={e => setMargin(e.target.value)} /></label><label className={labelClass}>Montant fixe HT (€)<Input type="number" min="0" value={fixed} onChange={e => setFixed(e.target.value)} /></label><label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={recommended} onChange={e => setRecommended(e.target.checked)} /> Utiliser le prix conseillé si disponible</label><Button disabled={importer.isPending || selected.length === 0} onClick={importSelected}>Importer {selected.length} sélectionné(s)</Button></div>
      <p className="text-xs text-muted-foreground">Majoration ≠ marge sur prix de vente. Les produits restent désactivés après import. Aucun stock fournisseur n'est ajouté au stock physique.</p>
    </section>
    <section className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[1100px] text-sm"><thead className="bg-muted/40"><tr>{['', 'Photo Icecat', 'Produit', 'Références / EAN', 'Achat HT', 'Conseillé', 'Stock total / local / arrivage', 'RAM / SSD / clavier', 'Statut'].map((x, i) => <th key={i} className="p-3 text-left">{i === 0 ? <input aria-label="Tout sélectionner" type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : items.map(p => p.sku))} /> : x}</th>)}</tr></thead><tbody>{items.map(p => <tr key={p.sku} className="border-t"><td className="p-3"><input aria-label={`Sélectionner ${p.sku}`} type="checkbox" checked={selected.includes(p.sku)} onChange={() => toggle(p.sku)} /></td><td className="p-3">{p.imageUrl ? <img src={p.imageUrl} alt={`Photo ${p.name}`} loading="lazy" referrerPolicy="no-referrer" className="h-20 w-20 rounded border object-contain bg-white" /> : <span className="text-xs text-muted-foreground">{p.icecatFound ? 'Image protégée' : 'Pas de photo'}</span>}</td><td className="p-3"><strong>{p.name}</strong><div className="text-xs text-muted-foreground">{p.icecatFound ? '✓ Fiche Icecat' : 'Icecat non trouvé'} · {p.manufacturer || '—'} · {p.category || '—'} / {p.subCategory || '—'}</div></td><td className="p-3">TD : {p.sku}<br />MPN : {p.manufacturerReference || '—'}<br />EAN : {p.ean || '—'}</td><td className="p-3">{money(p.priceHt, p.currencyCode)}</td><td className="p-3">{money(p.recommendedPrice, p.currencyCode)}</td><td className="p-3">{p.stock ?? '—'} / {p.localStock ?? '—'} / {p.incomingStock ?? '—'}</td><td className="p-3">{p.ramGb ?? '—'} Go / {p.ssdGb ?? '—'} Go / {p.keyboardLayout || '—'}</td><td className="p-3">{p.status || '—'}{p.imported ? ' · Importé' : ''}</td></tr>)}{!items.length && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Aucun résultat sur la page consultée.</td></tr>}</tbody></table></section>
    {result && <div className="flex items-center gap-3"><Button variant="outline" disabled={page === 0 || search.isFetching} onClick={() => changePage(page - 1)}>Page précédente</Button><span>Page {page + 1}</span><Button variant="outline" disabled={search.isFetching || (items.length < Number(filters.take)) || (!result.isExhaustive && !result.totalItems ? false : (page + 1) * Number(filters.take) >= result.totalItems)} onClick={() => changePage(page + 1)}>Page suivante</Button></div>}
    <section className="space-y-2"><Button variant="outline" onClick={() => setDiagnostic(!diagnostic)}>{diagnostic ? 'Masquer' : 'Afficher'} le diagnostic API</Button>{diagnostic && <pre className="max-h-80 overflow-auto rounded border p-3 text-xs">{JSON.stringify((search.data as any)?.lfinfoSupplierDiagnostic ?? 'Lancez une recherche.', null, 2)}</pre>}</section>
  </div>;
}
