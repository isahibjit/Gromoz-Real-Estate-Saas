import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  SearchableSelect,
} from "ui";

import { DashboardSidebar } from "../../../dashboard/DashboardSidebar";
import { WorkspacePage } from "../../../../../components/layout/PageHeader";
import { assignLeadsSidebarItems } from "../../assignment/leadAssignmentData";
import {
  ConnectionStepper,
  Header,
} from "./components/SharedMagicBricksComponents";
import {
  useMagicBricksIntegration,
  useMagicBricksIntegrationMutations,
} from "./useMagicBricksIntegration";

const skipFieldValue = "skip";

export function MapMagicBricksFieldsScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const integrationQuery = useMagicBricksIntegration();
  const mutations = useMagicBricksIntegrationMutations();
  const integration = integrationQuery.data;
  const crmFieldOptions = useMemo(
    () =>
      integration?.fieldOptions.map((option) => ({
        label: option.label,
        value: option.value,
        description: option.required ? "Required target field" : undefined,
      })) ?? [],
    [integration?.fieldOptions],
  );

  useEffect(() => {
    if (integration?.fieldMapping) {
      setMapping(integration.fieldMapping);
    }
  }, [integration?.fieldMapping]);

  const summary = useMemo(() => {
    if (!integration) {
      return { mapped: 0, requiredDone: 0, requiredTotal: 0, skipped: 0 };
    }

    const requiredTargets = integration.fieldOptions.filter(
      (option) => option.required,
    );
    const values = Object.values(mapping);

    return {
      mapped: values.filter((value) => value && value !== skipFieldValue).length,
      requiredDone: requiredTargets.filter((option) =>
        values.includes(option.value),
      ).length,
      requiredTotal: requiredTargets.length,
      skipped: values.filter((value) => value === skipFieldValue).length,
    };
  }, [integration, mapping]);

  const canContinue =
    integration &&
    integration.fieldOptions
      .filter((option) => option.required)
      .every((option) => Object.values(mapping).includes(option.value));

  return (
    <>
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={assignLeadsSidebarItems}
        activeItem="Lead Management"
        activeChild="Import Leads"
        onCollapse={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Header
          search={search}
          onSearchChange={setSearch}
          onMobileMenuOpen={() => setMobileOpen(true)}
          onDesktopSidebarToggle={() => setCollapsed((value) => !value)}
          breadcrumbs={["Connect to MagicBricks", "Map fields"]}
      />
      <WorkspacePage>
          <section>
            <h1 className="text-2xl font-extrabold text-secondary">
              Map MagicBricks fields
            </h1>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              Decide exactly how the public MagicBricks payload lands in your CRM.
              Lead name and mobile number must be mapped before testing.
            </p>
          </section>

          <ConnectionStepper activeStep={3} />

          {integrationQuery.isLoading ? (
            <Card className="rounded-md border border-slate-200 bg-white p-8 shadow-card">
              <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading field mapping...
              </div>
            </Card>
          ) : integration ? (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card sm:p-7">
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-secondary">
                      Portal to CRM field mapping
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">
                      These mappings are used by the public webhook at{" "}
                      <span className="font-extrabold text-secondary">
                        {integration.endpointUrl}
                      </span>
                      .
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-md border-slate-200 px-4 text-sm font-bold shadow-none"
                    onClick={() => setMapping(integration.fieldMapping)}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Reset to recommended mapping
                  </Button>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-[760px] w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="pb-3 text-left text-xs font-extrabold text-secondary">
                          MagicBricks field
                        </th>
                        <th className="pb-3 text-left text-xs font-extrabold text-secondary">
                          Sample
                        </th>
                        <th className="pb-3 text-left text-xs font-extrabold text-secondary">
                          CRM field
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {integration.sourceFields.map((field) => {
                        const selectedValue = mapping[field.key] ?? skipFieldValue;
                        const selectedOption = integration.fieldOptions.find(
                          (option) => option.value === selectedValue,
                        );

                        return (
                          <tr key={field.key}>
                            <td className="py-4 align-top">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold text-secondary">
                                  {field.label}
                                </span>
                                {selectedOption?.required ? (
                                  <Badge className="border-0 bg-blue-50 text-blue-700">
                                    Required target
                                  </Badge>
                                ) : null}
                              </div>
                            </td>
                            <td className="py-4 align-top">
                              <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                                {field.sample}
                              </span>
                            </td>
                            <td className="py-4 align-top">
                              <SearchableSelect
                                value={selectedValue}
                                onValueChange={(value) =>
                                  setMapping((current) => ({
                                    ...current,
                                    [field.key]: value,
                                  }))
                                }
                                options={crmFieldOptions}
                                placeholder="Select CRM field"
                                searchPlaceholder="Search CRM fields..."
                                noOptionsText="No CRM fields found"
                                ariaLabel={`Map ${field.label} to CRM field`}
                                contentClassName="min-w-[260px]"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 self-start rounded-md px-3 text-sm font-extrabold text-secondary hover:bg-slate-100"
                    onClick={() => navigate("/leads/import/connect/magicbricks")}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-md border-slate-200 px-5 text-sm font-bold shadow-none"
                      disabled={mutations.saveFieldMapping.isPending}
                      onClick={async () => {
                        await mutations.saveFieldMapping.mutateAsync(mapping);
                        toast.success("MagicBricks field mapping saved");
                      }}
                    >
                      {mutations.saveFieldMapping.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Save mapping
                    </Button>
                    <Button
                      type="button"
                      className="h-10 rounded-md px-5 text-sm font-bold"
                      disabled={!canContinue || mutations.saveFieldMapping.isPending}
                      onClick={async () => {
                        await mutations.saveFieldMapping.mutateAsync(mapping);
                        toast.success("MagicBricks field mapping saved");
                        navigate("/leads/import/connect/magicbricks");
                      }}
                    >
                      Save and finish
                      <CheckCircle2 className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>

              <aside className="space-y-5">
                <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card">
                  <h3 className="text-base font-extrabold text-secondary">
                    Mapping summary
                  </h3>
                  <div className="mt-5 space-y-4">
                    <div className="rounded-md border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-bold text-muted-foreground">
                        Mapped fields
                      </p>
                      <p className="mt-2 text-2xl font-extrabold text-secondary">
                        {summary.mapped}
                      </p>
                    </div>
                    <div className="rounded-md border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-bold text-muted-foreground">
                        Required targets covered
                      </p>
                      <p className="mt-2 text-2xl font-extrabold text-secondary">
                        {summary.requiredDone}/{summary.requiredTotal}
                      </p>
                    </div>
                    <div className="rounded-md border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-bold text-muted-foreground">
                        Skipped fields
                      </p>
                      <p className="mt-2 text-2xl font-extrabold text-secondary">
                        {summary.skipped}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card">
                  <h3 className="text-base font-extrabold text-secondary">
                    Recommended mapping
                  </h3>
                  <div className="mt-4 space-y-3">
                    {Object.entries(integration.fieldMapping).map(([key, value]) => (
                      <div key={key} className="flex items-start justify-between gap-3">
                        <p className="text-xs font-bold text-secondary">{key}</p>
                        <p className="text-right text-xs font-semibold text-muted-foreground">
                          {
                            integration.fieldOptions.find(
                              (option) => option.value === value,
                            )?.label
                          }
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </aside>
            </div>
          ) : (
            <Card className="rounded-md border border-destructive/20 bg-white p-8 shadow-card">
              <p className="text-sm font-semibold text-destructive">
                Failed to load field mapping configuration.
              </p>
            </Card>
          )}
      </WorkspacePage>
    </>
  );
}
