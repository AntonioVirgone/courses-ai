# I prezzi sono numeri interi in centesimi

Ogni importo nel codice, nel database e nelle API è un numero intero di centesimi di euro: 12,50 € è `1250`. La conversione in euro avviene solo quando un importo viene mostrato al cliente.

Con i numeri in virgola mobile le somme dei prezzi accumulano errori di arrotondamento, e un totale del carrello che differisce di un centesimo dal totale dell'ordine è un bug che arriva al supporto clienti. Gli interi rendono le somme esatte e i confronti banali. I nomi delle proprietà finiscono in `Cents` (`unitPriceCents`, `totalCents`) perché l'unità si legga nel codice.

Diventano più semplici i calcoli e i test sulle regole dei prezzi. Diventa più laboriosa la visualizzazione, che deve sempre passare da una funzione di formattazione.

## Considered Options

- **Numeri in virgola mobile in euro.** Scartato: errori di arrotondamento nelle somme.
- **Un tipo decimale di libreria.** Scartato: una dipendenza in più per un problema che gli interi risolvono.
