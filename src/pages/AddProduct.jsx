import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, describeError } from "../api/client";
import { useAuthStore } from "../store/authStore";
import { AppShell } from "../components/AppShell";
import { Field } from "../components/Field";
import { Button } from "../components/Button";
import { Reveal } from "../components/Reveal";
import { categoryLabel, FALLBACK_CATEGORIES } from "../constants/categories";
import { ArrowClockwise, Check, SpinnerGap } from "../components/icons";

/*
 * A blank form is the state before any typing, so it lives outside the
 * component instead of being re-allocated on every render.
 */
const BLANK = { name: "", category: "", brand: "", price: "", stock: "", specs: "" };

/**
 * Client-side rules, mirroring the server's validateProduct().
 *
 * Both sides check, on purpose: this exists to give immediate feedback, the
 * server check is the one that actually enforces. A client-only check would be
 * a suggestion; a server-only check means a round trip per keystroke.
 */
function validate(values) {
    const errors = {};

    if (!values.name.trim()) errors.name = "Name is required";
    else if (values.name.trim().length > 120) errors.name = "Use 120 characters or fewer";

    if (!values.category) errors.category = "Pick a category";

    if (values.price !== "") {
        const amount = Number(values.price);
        if (!Number.isFinite(amount) || amount < 0) errors.price = "Enter zero or a positive number";
    }

    if (values.stock !== "") {
        const count = Number(values.stock);
        if (!Number.isInteger(count) || count < 0) errors.stock = "Enter a whole number, zero or more";
    }

    return errors;
}

/** `key: value` lines -> the object the API expects. */
function parseSpecs(text) {
    const entries = text
        .split("\n")
        .map((line) => {
            const at = line.indexOf(":");
            return at === -1 ? null : [line.slice(0, at).trim(), line.slice(at + 1).trim()];
        })
        .filter((pair) => pair && pair[0]);

    return entries.length > 0 ? Object.fromEntries(entries) : null;
}

export function AddProduct() {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);

    const navigate = useNavigate();

    const [values, setValues] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [saving, setSaving] = useState(false);

    function update(field) {
        return (event) => {
            const { value } = event.target;
            setValues((previous) => ({ ...previous, [field]: value }));
            // Clear a field's error as soon as the user edits it; re-validating
            // on every keystroke would shout before they finished typing.
            setErrors((previous) => (previous[field] ? { ...previous, [field]: undefined } : previous));
        };
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setFormError(null);

        const found = validate(values);
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setSaving(true);
        try {
            await api.post("/products", {
                name: values.name.trim(),
                category: values.category,
                brand: values.brand.trim() || null,
                price: values.price === "" ? null : Number(values.price),
                stock: values.stock === "" ? undefined : Number(values.stock),
                specs: parseSpecs(values.specs),
            });

            navigate("/", { replace: true });
        } catch (error) {
            const { message, fields } = describeError(error);
            if (fields.length > 0) {
                setErrors(Object.fromEntries(fields.map((f) => [f.field, f.message])));
            }
            setFormError(message);
            setSaving(false);
        }
    }

    return (
        <AppShell user={user} onLogout={logout}>
            <div className="form-page">
                <Reveal className="form-page__head">
                    <h1 className="form-page__title">Add a component</h1>
                    <p className="form-page__sub">
                        This request carries your token too, and the row is attributed to{" "}
                        <span className="mono">{user?.handle}</span> from the verified claims rather
                        than from anything you type here.
                    </p>
                </Reveal>

                <Reveal delay={60}>
                    <form className="card card--form" onSubmit={handleSubmit} noValidate>
                        {formError ? (
                            <p className="alert" role="alert">
                                {formError}
                            </p>
                        ) : null}

                        <Field label="Name" error={errors.name}>
                            {(props) => (
                                <input
                                    {...props}
                                    className="input"
                                    type="text"
                                    required
                                    autoFocus
                                    value={values.name}
                                    onChange={update("name")}
                                />
                            )}
                        </Field>

                        <div className="row">
                            <Field label="Category" error={errors.category}>
                                {(props) => (
                                    <select
                                        {...props}
                                        className="input"
                                        required
                                        value={values.category}
                                        onChange={update("category")}
                                    >
                                        <option value="">Choose one</option>
                                        {FALLBACK_CATEGORIES.map((name) => (
                                            <option key={name} value={name}>
                                                {categoryLabel(name)}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </Field>

                            <Field label="Brand" error={errors.brand}>
                                {(props) => (
                                    <input
                                        {...props}
                                        className="input"
                                        type="text"
                                        value={values.brand}
                                        onChange={update("brand")}
                                    />
                                )}
                            </Field>
                        </div>

                        <div className="row">
                            <Field label="Price" hint="Leave blank if unpriced." error={errors.price}>
                                {(props) => (
                                    <input
                                        {...props}
                                        className="input"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={values.price}
                                        onChange={update("price")}
                                    />
                                )}
                            </Field>

                            <Field label="Stock" hint="Whole units on hand." error={errors.stock}>
                                {(props) => (
                                    <input
                                        {...props}
                                        className="input"
                                        type="number"
                                        step="1"
                                        min="0"
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={values.stock}
                                        onChange={update("stock")}
                                    />
                                )}
                            </Field>
                        </div>

                        <Field
                            label="Specifications"
                            hint="One per line, as key: value. The API splits on the first colon, so values like 4.2GHz survive."
                            error={errors.specs}
                        >
                            {(props) => (
                                <textarea
                                    {...props}
                                    className="input input--area"
                                    rows={5}
                                    placeholder={"cores: 16\nboost: 5.4GHz\nsocket: AM5"}
                                    value={values.specs}
                                    onChange={update("specs")}
                                />
                            )}
                        </Field>

                        <div className="form-page__actions">
                            <Button type="submit" disabled={saving}>
                                {saving ? (
                                    <>
                                        <SpinnerGap className="spin" size={16} weight="bold" />
                                            Saving…

                                    </>
                                ) : (
                                    <>
                                        <Check size={16} weight="bold" />
                                        Save product
                                    </>
                                )}
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => navigate(-1)}
                                disabled={saving}
                            >
                                <ArrowClockwise size={16} weight="bold" />
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Reveal>
            </div>
        </AppShell>
    );
}
