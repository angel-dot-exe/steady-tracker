#!/usr/bin/env python3
"""Save Jira OAuth credentials directly to Steady's private Appwrite function."""
import getpass
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
CLI = ["npx", "--yes", "appwrite-cli@28.10.0", "--config-file", str(ROOT / "appwrite.config.json")]
FUNCTION = "ambient-sync"


def run(*args, sensitive=()):
    result = subprocess.run(CLI + list(args) + ["--json"], cwd=ROOT, capture_output=True, text=True)
    if result.returncode:
        message = result.stderr or "Appwrite could not save the setting."
        for value in sensitive:
            message = message.replace(value, "[redacted]")
        raise RuntimeError(message.strip())
    return json.loads(result.stdout)


def main():
    if not sys.stdin.isatty():
        raise RuntimeError("Run this script in Terminal so the secret can be entered privately.")
    config = json.loads((ROOT / "appwrite.config.json").read_text())
    if config.get("projectId") != "6ae1f281001e1b52c48c" or config.get("endpoint") != "https://fra.cloud.appwrite.io/v1":
        raise RuntimeError("The configured project is not Steady's Appwrite project.")
    variables = run("functions", "list-variables", "--function-id", FUNCTION)
    existing = {v["key"]: v["$id"] for v in variables["variables"]}
    print("Steady: connect your Jira app")
    print("In Atlassian Developer Console, open Steady Ambient Tracker > Settings.")
    print("These values go directly to secret variables in your Appwrite project.")
    print("They are not saved in this folder or printed in chat. No paid services are enabled.\n")
    client_id = input("Jira Client ID: ").strip()
    client_secret = getpass.getpass("Jira Secret (typing is hidden): ").strip()
    if not client_id or not client_secret or any(c.isspace() for c in client_id + client_secret):
        raise RuntimeError("Both values are required and must not contain whitespace.")
    for key, value in [("JIRA_CLIENT_ID", client_id), ("JIRA_CLIENT_SECRET", client_secret)]:
        operation = "update-variable" if key in existing else "create-variable"
        variable_id = existing.get(key, key.lower().replace("_", "-"))
        run("functions", operation, "--function-id", FUNCTION, "--variable-id", variable_id,
            "--key", key, "--value", value, "--secret", sensitive=(client_id, client_secret))
        print(key + " saved privately.")
    print("\nSaved. Return to the conversation and say done to finish deployment and authorization.")


if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print("\nCancelled. Any variables already saved stay private.", file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        print("Setup stopped: " + str(exc), file=sys.stderr)
        sys.exit(1)
