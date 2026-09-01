// Companies list page (Phase 2)

import { getCompanies } from '@/lib/airtable'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SectionLabel } from '@/components/ui/section-label'
import Link from 'next/link'

export default async function CompaniesPage() {
  const companies = await getCompanies({ maxRecords: 100 })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-syne">Entreprises</h1>
          <p className="text-text-muted mt-2">
            {companies.length} entreprise{companies.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/companies/new">
          <Button>+ Nouvelle entreprise</Button>
        </Link>
      </div>

      {companies.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <p className="text-text-muted text-lg">Aucune entreprise pour le moment</p>
            <Link href="/companies/new">
              <Button>Créer la première entreprise</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Link key={company.id} href={`/companies/${company.id}`}>
              <Card className="hover:border-accent/50 transition-all cursor-pointer h-full">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{company.name}</h3>
                    {company.industry && (
                      <p className="text-text-muted text-sm mt-1">{company.industry}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-text-muted">
                    {company.city && <span>{company.city}</span>}
                    {company.city && company.country && <span>·</span>}
                    {company.country && <span>{company.country}</span>}
                  </div>

                  {company.companySize && (
                    <div className="text-xs text-text-muted">
                      {company.companySize}
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
