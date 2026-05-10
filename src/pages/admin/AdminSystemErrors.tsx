import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { AlertCircle } from "lucide-react";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";

export default function AdminSystemErrors() {
  const [funcFilter, setFuncFilter] = useState("");
  const [severity, setSeverity] = useState<string>("all");

  const { data: errors, isLoading } = useQuery({
    queryKey: ["system-errors", funcFilter, severity],
    queryFn: async () => {
      let q = supabase.from("system_errors")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (funcFilter) q = q.ilike("function_name", `%${funcFilter}%`);
      if (severity !== "all") q = q.eq("severity", severity);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const sevColor = (s: string) =>
    s === "critical" ? "destructive" : s === "warning" ? "secondary" : "default";

  return (
    <AdminDashboardLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertCircle className="h-6 w-6" /> System Errors
        </h1>
        <p className="text-sm text-muted-foreground">Edge function exceptions and runtime errors (last 200)</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Filter by function name…"
          value={funcFilter}
          onChange={(e) => setFuncFilter(e.target.value)}
          className="max-w-xs"
        />
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !errors?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No errors recorded 🎉</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {errors.map((e: any) => (
            <Card key={e.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base font-mono">{e.function_name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={sevColor(e.severity) as any}>{e.severity}</Badge>
                    <span className="text-xs text-muted-foreground">{format(new Date(e.created_at), "PP p")}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium mb-2">{e.error_message}</p>
                {e.error_stack && (
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40">{e.error_stack}</pre>
                )}
                {e.context && Object.keys(e.context).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer">Context</summary>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(e.context, null, 2)}</pre>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </AdminDashboardLayout>
  );
}
