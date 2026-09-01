// Company detail page (Phase 2)

import { getCompanyById, getContacts, getOpportunities } from '@/lib/airtable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionLabel } from '@/components/ui/section-label'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface CompanyPageProps {
  params: Promise<{ id: string }>
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { id } = await params

  try {
    const company = await getCompanyById(id)
    const [contacts, opportunities] = await Promise.all([
      getContacts({ companyId: id }),
      getOpportunities({ companyId: id }),
    ])

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/companies"
                className="text-text-muted hover:text-text-primary text-sm"
              >
                ← Entreprises
              </Link>
            </div>
            <h1 className="text-4xl font-bold font-syne">{company.name}</h1>
            {company.industry && (
              <p className="text-text-muted mt-2 text-lg">{company.industry}</p>
            )}
          </div>
          <Link href={`/companies/${id}/edit`}>
            <Button variant="ghost">Modifier</Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Company Info */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {company.website && (
                <div>
                  <div className="text-text-muted text-xs mb-1">Site web</div>
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline text-sm"
                  >
                    {company.website}
                  </a>
                </div>
              )}

              {(company.city || company.country) && (
                <div>
                  <div className="text-text-muted text-xs mb-1">Localisation</div>
                  <div className="text-sm">
                    {company.city}
                    {company.city && company.country && ', '}
                    {company.country}
                  </div>
                </div>
              )}

              {company.phone && (
                <div>
                  <div className="text-text-muted text-xs mb-1">Téléphone</div>
                  <div className="text-sm">{company.phone}</div>
                </div>
              )}

              {company.companySize && (
                <div>
                  <div className="text-text-muted text-xs mb-1">Taille</div>
                  <div className="text-sm">{company.companySize}</div>
                </div>
              )}

              {company.linkedin && (
                <div>
                  <div className="text-text-muted text-xs mb-1">LinkedIn</div>
                  <a
                    href={company.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline text-sm"
                  >
                    Voir le profil
                  </a>
                </div>
              )}

              {company.notes && (
                <div>
                  <div className="text-text-muted text-xs mb-1">Notes</div>
                  <div className="text-sm whitespace-pre-wrap">{company.notes}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contacts and Opportunities */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contacts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  Contacts ({contacts.length})
                </CardTitle>
                <Link href={`/contacts/new?companyId=${id}`}>
                  <Button size="sm" variant="ghost">
                    + Ajouter
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {contacts.length === 0 ? (
                  <p className="text-text-muted text-sm">Aucun contact</p>
                ) : (
                  <div className="space-y-3">
                    {contacts.map((contact) => (
                      <Link
                        key={contact.id}
                        href={`/contacts/${contact.id}`}
                        className="block p-3 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">
                              {contact.firstName} {contact.lastName}
                            </div>
                            {contact.jobTitle && (
                              <div className="text-text-muted text-sm">
                                {contact.jobTitle}
                              </div>
                            )}
                          </div>
                          {contact.email && (
                            <div className="text-text-muted text-xs">
                              {contact.email}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Opportunities */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  Opportunités ({opportunities.length})
                </CardTitle>
                <Link href={`/prospects/new?companyId=${id}`}>
                  <Button size="sm" variant="ghost">
                    + Créer
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {opportunities.length === 0 ? (
                  <p className="text-text-muted text-sm">Aucune opportunité</p>
                ) : (
                  <div className="space-y-3">
                    {opportunities.map((opportunity) => (
                      <Link
                        key={opportunity.id}
                        href={`/prospects/${opportunity.id}`}
                        className="block p-3 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{opportunity.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="default">{opportunity.stage}</Badge>
                              {opportunity.potentialValue && (
                                <span className="text-text-muted text-sm">
                                  {opportunity.potentialValue}€
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    notFound()
  }
}
