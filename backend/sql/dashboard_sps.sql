-- Limpieza opcional si existían funciones previas con estos nombres
DROP FUNCTION IF EXISTS sp_dashboard_main_indicators(BIGINT);
DROP FUNCTION IF EXISTS sp_dashboard_notifications(BIGINT);
DROP FUNCTION IF EXISTS sp_dashboard_weekly_summary(BIGINT);

-- ============================================================
-- SP 1: INDICADORES PRINCIPALES (4 cards)
-- Devuelve JSON por OUT param
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_dashboard_main_indicators(
    IN p_tenant_id BIGINT,
    OUT p_result JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    SELECT jsonb_build_object(
        'todayLabel', to_char(CURRENT_DATE, 'DD/MM/YYYY'),
        'ordersToday', (
            SELECT COUNT(*)::INT
            FROM orders o
            WHERE o.tenant_id = p_tenant_id
              AND o.delivery_at::date = CURRENT_DATE
        ),
        'tripsInProgress', (
            SELECT COUNT(*)::INT
            FROM orders o
            WHERE o.tenant_id = p_tenant_id
              AND o.status = 'dispatched'
        ),
        'deliveriesCompleted', (
            SELECT COUNT(*)::INT
            FROM orders o
            WHERE o.tenant_id = p_tenant_id
              AND o.status = 'delivered'
              AND o.delivered_at >= date_trunc('month', CURRENT_DATE)
        ),
        'toCollectAmount', (
            SELECT COALESCE(SUM(i.amount), 0)::NUMERIC(14,2)
            FROM invoices i
            WHERE i.tenant_id = p_tenant_id
              AND i.status IN ('pending', 'overdue')
        ),
        'toCollectInvoices', (
            SELECT COUNT(*)::INT
            FROM invoices i
            WHERE i.tenant_id = p_tenant_id
              AND i.status IN ('pending', 'overdue')
        )
    )
    INTO p_result;
END;
$$;

-- ============================================================
-- SP 2: NOTIFICACIONES / ALERTAS DASHBOARD
-- Devuelve arreglo JSON por OUT param
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_dashboard_notifications(
    IN p_tenant_id BIGINT,
    OUT p_items JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
WITH overdue_invoices AS (
    SELECT
        i.id AS id,
        'invoice_overdue'::TEXT AS code,
        'error'::TEXT AS severity,
        'Factura vencida'::TEXT AS title,
        (
            i.code || ' - $' || to_char(i.amount, 'FM999,999,999,990.00') || ' - ' || COALESCE(c.name, '')
        )::TEXT AS message,
        '/app/cobranza'::TEXT AS action_path,
        'Ver'::TEXT AS action_label,
        i.created_at
    FROM invoices i
    LEFT JOIN clients c
      ON c.id = i.client_id
     AND c.tenant_id = i.tenant_id
    WHERE i.tenant_id = p_tenant_id
      AND (
        i.status = 'overdue'
        OR (i.status = 'pending' AND i.due_date < CURRENT_DATE)
      )
    ORDER BY i.due_date ASC, i.id DESC
    LIMIT 3
),
unscheduled_orders AS (
    SELECT
        (1000000000 + o.id)::BIGINT AS id,
        'order_pending_schedule'::TEXT AS code,
        'warning'::TEXT AS severity,
        'Pedido sin programar'::TEXT AS title,
        (
            o.code || ' - ' || COALESCE(o.cubic_meters::TEXT, '0') || ' m3 - Entrega ' ||
            to_char(o.delivery_at, 'DD/MM/YYYY HH24:MI')
        )::TEXT AS message,
        '/app/programacion'::TEXT AS action_path,
        'Programar'::TEXT AS action_label,
        o.created_at
    FROM orders o
    WHERE o.tenant_id = p_tenant_id
      AND o.status = 'pending'
    ORDER BY o.delivery_at ASC, o.id DESC
    LIMIT 3
),
custom_notifications AS (
    SELECT
        (2000000000 + n.id)::BIGINT AS id,
        COALESCE(n.code, 'custom_notification')::TEXT AS code,
        COALESCE(n.severity, 'info')::TEXT AS severity,
        n.title::TEXT AS title,
        n.message::TEXT AS message,
        NULL::TEXT AS action_path,
        NULL::TEXT AS action_label,
        n.created_at
    FROM notifications n
    WHERE n.tenant_id = p_tenant_id
      AND (n.expires_at IS NULL OR n.expires_at > NOW())
    ORDER BY n.created_at DESC
    LIMIT 3
)
SELECT COALESCE(
    jsonb_agg(
        jsonb_build_object(
            'id', t.id,
            'code', t.code,
            'severity', t.severity,
            'title', t.title,
            'message', t.message,
            'actionPath', t.action_path,
            'actionLabel', t.action_label,
            'createdAt', t.created_at
        )
        ORDER BY t.created_at DESC
    ),
    '[]'::jsonb
)
INTO p_items
FROM (
    SELECT * FROM overdue_invoices
    UNION ALL
    SELECT * FROM unscheduled_orders
    UNION ALL
    SELECT * FROM custom_notifications
    ORDER BY created_at DESC
    LIMIT 6
) t;
END;
$$;

-- ============================================================
-- SP 3: RESUMEN SEMANAL (3 barras)
-- Devuelve JSON por OUT param
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_dashboard_weekly_summary(
    IN p_tenant_id BIGINT,
    OUT p_summary JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
WITH week_window AS (
    SELECT
        date_trunc('week', CURRENT_DATE)::date AS start_date,
        (date_trunc('week', CURRENT_DATE)::date + INTERVAL '7 day')::date AS end_date
),
orders_week AS (
    SELECT o.*
    FROM orders o
    CROSS JOIN week_window w
    WHERE o.tenant_id = p_tenant_id
      AND o.delivery_at::date >= w.start_date
      AND o.delivery_at::date < w.end_date
),
invoices_week AS (
    SELECT i.*
    FROM invoices i
    CROSS JOIN week_window w
    WHERE i.tenant_id = p_tenant_id
      AND i.issue_date >= w.start_date
      AND i.issue_date < w.end_date
)
SELECT jsonb_build_object(
    'weeklyCompletedOrdersPct',
    COALESCE(
        ROUND(
            (
                100.0 * (
                    SELECT COUNT(*) FROM orders_week ow WHERE ow.status = 'delivered'
                ) / NULLIF((SELECT COUNT(*) FROM orders_week), 0)
            )::NUMERIC,
            2
        ),
        0
    ),
    'weeklyDeliveryEfficiencyPct',
    COALESCE(
        ROUND(
            (
                100.0 * (
                    SELECT COUNT(*)
                    FROM orders_week ow
                    WHERE ow.status = 'delivered'
                      AND ow.delivered_at IS NOT NULL
                      AND ow.delivered_at <= ow.delivery_at
                ) / NULLIF(
                    (
                        SELECT COUNT(*)
                        FROM orders_week ow
                        WHERE ow.status = 'delivered'
                    ),
                    0
                )
            )::NUMERIC,
            2
        ),
        0
    ),
    'collectionRatePct',
    COALESCE(
        ROUND(
            (
                100.0 * (
                    SELECT COUNT(*)
                    FROM invoices_week iw
                    WHERE iw.status = 'paid'
                ) / NULLIF((SELECT COUNT(*) FROM invoices_week), 0)
            )::NUMERIC,
            2
        ),
        0
    )
)
INTO p_summary;
END;
$$;
