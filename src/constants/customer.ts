// Titles offered for an individual customer. Stored verbatim in
// customers.title (varchar(20)) and pushed to Evolve as <Title> on the person
// branch of the Customer Maintenance payload — Evolve takes a plain string
// there (see apitest/src/tests/customer-maintenance.ts, which sends 'Mr'), so
// these are values rather than codes.
//
// A company has no title: the Evolve payload only carries <Title> for
// CustomerType 'P' (person), which is why the field is individual-only in both
// customer forms.
export const CUSTOMER_TITLES = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof"] as const;
