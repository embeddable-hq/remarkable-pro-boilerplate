# Interview guide

Ask questions in the order below. Don't dump the full list at once — group by topic, wait for answers, and follow up before moving on. If the user has already answered a question (e.g. from a previous session's notes), skip it.

**Prefer data over questions.** Before asking the user something the database can answer, offer to run an exploratory query instead. Generate a minimal in-memory cube model and pipe it to `cube-explore-query.cjs` via stdin — no file needs to exist yet. Always ask for permission first: describe what you want to check in plain English and ask *"Want me to run that?"* One permission per query, never batched.

---

## Group 1: Domain scope

> Ask these first to bound the work.

1. **Which domain or set of tables would you like to model?**
   - If unsure, show the user what's already in `src/embeddable.com/models/cubes/` and ask what's missing.

2. **What is the primary entity in this domain?**
   - Example: "an order", "a user session", "a support ticket"

3. **Which tables make up this domain?** (list them)
   - Are any of them large fact tables (one row per event/transaction)?
   - Are any of them smaller dimension/lookup tables (one row per entity)?

---

## Group 2: Table grain and primary keys

> One set of these questions per table.

4. **What does one row in `[table]` represent?**
   - Example: "one order placed by a customer", "one daily aggregate of listens per track"

5. **What is the primary key column?**
   - If the table has a composite key, ask which column to use as the proxy PK (e.g. the `id` column).

6. **Is there a main timestamp column?** (for time-based filtering)
   - Example: `created_at`, `event_date`, `listened_date`

---

## Group 3: Dimensions (how to slice)

> Focus on what dashboard users will want to filter and group by.

7. **What are the most important categorical columns?**
   - Examples: status, country, plan_tier, product_category

8. **Are any column values encoded or abbreviated?**
   - Example: `gender = 'm'/'f'` → use a CASE expression to expand
   - Example: `status = 1/2/3` → what do each value mean?

9. **Are there any columns that should NOT be shown in the builder?**
   - Internal IDs, raw foreign keys, technical flags?

---

## Group 4: Measures (what to aggregate)

> Focus on the numbers the business actually cares about. Before asking the user which columns drive a measure, offer to pull a sample aggregate or column list from the database. Always ask permission before running any query.

10. **What are the key metrics for this domain?**
    - Examples: count of orders, total revenue, average session duration, unique users

11. **Are any metrics calculated from multiple columns?**
    - Examples: `revenue = quantity * unit_price`, `margin = (price - cost) / price`

12. **Should any measures have display formatting?**
    - Currency (USD/EUR)? Percentage? Decimal places?

---

## Group 5: Joins

> Only ask if there are multiple tables in the domain.

13. **How does `[table A]` link to `[table B]`?**
    - What is the foreign key column (e.g. `orders.customer_id` → `customers.id`)?
    - Is it many-to-one, one-to-many, or one-to-one?

14. **Are there any indirect joins?** (A → B → C)

15. **Is there any table that should NOT be directly joined?**
    - (Sometimes a bridge table is needed, or a join would cause fan-out)

---

## Group 6: View design

> The view is the denormalized surface that dashboard authors use.

16. **What is the most common query pattern in this domain?**
    - Example: "filter by date, group by country, show total revenue"

17. **Which dimensions from joined tables are most useful in the view?**
    - You don't need to include everything — focus on what appears in dashboards.

18. **Should the view include all measures, or just the important ones?**

---

## Follow-up triggers

Use exploration (if available) when:

- A column's values are unclear → run a distinct-values query to see them
- You're unsure whether a FK actually links (e.g. `orders.customer_id` → `customers.id`) → run a LEFT JOIN count to check for nulls
- A calculated measure looks complex → generate the cube and run a sanity-check query

---

## Notes format

Save to `.claude/notes/cube-models/<domain>.md`:

```markdown
# Domain: <name>
Last updated: <date>

## Tables
- `orders` — one row per order placed; fact table; PK: `order_id`
- `customers` — one row per customer account; dimension table; PK: `customer_id`

## Joins
- `orders.customer_id` → `customers.customer_id` (many-to-one)

## Business context
- "Revenue" means `amount` (USD); formatted as currency, 2 decimal places
- `status` codes: 1=pending, 2=processing, 3=complete, 4=cancelled
- `internal_flag` column should be hidden (`public: false`)

## Modeling decisions
- Used CASE on `status` to expand to readable labels
- `orders` is the fact cube; join declared there (many-to-one to customers)
- View includes only country and tier from customers (not internal_id)

## Open questions
- Is `discount_amount` already net-of-tax or gross? (user to verify)

## Connection
- sample_db (demo Embeddable workspace DB)
```
