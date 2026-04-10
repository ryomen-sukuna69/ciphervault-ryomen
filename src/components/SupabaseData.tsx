"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type VaultItem = {
  id: number;
  title: string;
  summary?: string;
};

export default function SupabaseData() {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    async function loadItems() {
      setLoading(true);
      setError(null);
      setEmpty(false);

      const { data, error } = await supabase
        .from("vault_items")
        .select("id,title,summary")
        .order("id", { ascending: true });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setEmpty(true);
        setItems([]);
        setLoading(false);
        return;
      }

      setItems(data as VaultItem[]);
      setLoading(false);
    }

    loadItems();
  }, []);

  return (
    <div className="data-block">
      {loading && <p>Loading Supabase data…</p>}

      {!loading && error && (
        <div className="warning">
          <strong>Unable to load Supabase data:</strong> {error}
        </div>
      )}

      {!loading && !error && empty && (
        <div className="hint">
          No records were found in the <code>vault_items</code> table.
          <br />
          Create the table in Supabase with columns <code>id</code>, <code>title</code>, and{' '}
          <code>summary</code>.
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="items-grid">
          {items.map((item) => (
            <article key={item.id} className="item-card">
              <h3>{item.title}</h3>
              <p>{item.summary ?? "No description available."}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
