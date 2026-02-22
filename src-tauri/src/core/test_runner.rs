//! @module core/test_runner
//! @description Test framework detection and test execution engine
//!
//! PURPOSE:
//! - Detect test frameworks from project configuration (vitest, jest, cargo test, playwright, pytest)
//! - Execute tests via detected framework commands
//! - Parse test output (JSON reporters preferred) for structured results
//! - Extract coverage information from lcov/istanbul reports
//!
//! DEPENDENCIES:
//! - std::process - Command execution
//! - std::fs - File system reading
//! - std::path - Path operations
//! - serde_json - JSON output parsing
//! - crate::models::test_plan - Test framework info types
//!
//! EXPORTS:
//! - detect_test_framework - Detect test framework from project files
//! - run_tests - Execute tests and return structured results
//! - parse_vitest_output - Parse Vitest JSON output
//! - parse_jest_output - Parse Jest JSON output
//! - parse_cargo_test_output - Parse cargo test output
//! - parse_coverage_lcov - Extract coverage % from lcov file
//!
//! PATTERNS:
//! - Framework detection uses priority: config files > package.json deps > conventions
//! - Test execution uses --reporter=json when available for structured output
//! - Coverage is optional and extracted from standard lcov.info location
//!
//! CLAUDE NOTES:
//! - Always prefer JSON reporters for reliable parsing
//! - Vitest: pnpm vitest run --reporter=json
//! - Jest: pnpm jest --json --outputFile=results.json
//! - Cargo: cargo test -- --format=json (nightly only, fallback to text parsing)
//! - Playwright: pnpm playwright test --reporter=json
//! - Coverage files typically at coverage/lcov.info or target/coverage/lcov.info

use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::process::{Command, Output};

use crate::models::test_plan::TestFrameworkInfo;

/// Detect the test framework used in a project.
/// Returns framework info with command to run tests.
pub fn detect_test_framework(project_path: &str) -> Option<TestFrameworkInfo> {
    let path = Path::new(project_path);

    // Check for Rust projects first (Cargo.toml)
    if path.join("Cargo.toml").exists() {
        return Some(TestFrameworkInfo {
            name: "cargo test".to_string(),
            command: "cargo test".to_string(),
            config_file: Some("Cargo.toml".to_string()),
            coverage_command: Some("cargo tarpaulin --out lcov".to_string()),
        });
    }

    // Check for Python projects
    if path.join("pytest.ini").exists()
        || path.join("conftest.py").exists()
        || path.join("pyproject.toml").exists()
    {
        let config_file = if path.join("pytest.ini").exists() {
            Some("pytest.ini".to_string())
        } else if path.join("pyproject.toml").exists() {
            Some("pyproject.toml".to_string())
        } else {
            None
        };

        return Some(TestFrameworkInfo {
            name: "pytest".to_string(),
            command: "pytest --tb=short -q".to_string(),
            config_file,
            coverage_command: Some("pytest --cov --cov-report=lcov".to_string()),
        });
    }

    // Check for Go projects
    if path.join("go.mod").exists() {
        return Some(TestFrameworkInfo {
            name: "go test".to_string(),
            command: "go test ./...".to_string(),
            config_file: Some("go.mod".to_string()),
            coverage_command: Some("go test -coverprofile=coverage.out ./...".to_string()),
        });
    }

    // Check for JavaScript/TypeScript projects
    let pkg_json_path = path.join("package.json");
    if pkg_json_path.exists() {
        if let Ok(content) = fs::read_to_string(&pkg_json_path) {
            if let Ok(pkg) = serde_json::from_str::<serde_json::Value>(&content) {
                let deps = merge_deps(&pkg);

                // Check for specific test frameworks in order of preference
                // Vitest (preferred for Vite projects)
                if deps.contains_key("vitest") {
                    let config_file = find_config_file(path, &[
                        "vitest.config.ts",
                        "vitest.config.js",
                        "vitest.config.mts",
                        "vite.config.ts",
                        "vite.config.js",
                    ]);
                    return Some(TestFrameworkInfo {
                        name: "Vitest".to_string(),
                        command: "pnpm vitest run --reporter=json".to_string(),
                        config_file,
                        coverage_command: Some(
                            "pnpm vitest run --coverage --reporter=json".to_string(),
                        ),
                    });
                }

                // Playwright (E2E)
                if deps.contains_key("@playwright/test") || deps.contains_key("playwright") {
                    let config_file = find_config_file(
                        path,
                        &["playwright.config.ts", "playwright.config.js"],
                    );
                    return Some(TestFrameworkInfo {
                        name: "Playwright".to_string(),
                        command: "pnpm playwright test --reporter=json".to_string(),
                        config_file,
                        coverage_command: None, // Playwright doesn't have built-in coverage
                    });
                }

                // Jest
                if deps.contains_key("jest") {
                    let config_file = find_config_file(
                        path,
                        &["jest.config.ts", "jest.config.js", "jest.config.json"],
                    );
                    return Some(TestFrameworkInfo {
                        name: "Jest".to_string(),
                        command: "pnpm jest --json".to_string(),
                        config_file,
                        coverage_command: Some("pnpm jest --coverage --json".to_string()),
                    });
                }

                // Mocha
                if deps.contains_key("mocha") {
                    let config_file =
                        find_config_file(path, &[".mocharc.json", ".mocharc.js", "mocha.opts"]);
                    return Some(TestFrameworkInfo {
                        name: "Mocha".to_string(),
                        command: "pnpm mocha --reporter json".to_string(),
                        config_file,
                        coverage_command: Some("pnpm nyc mocha --reporter json".to_string()),
                    });
                }

                // Cypress (E2E)
                if deps.contains_key("cypress") {
                    let config_file = find_config_file(
                        path,
                        &["cypress.config.ts", "cypress.config.js", "cypress.json"],
                    );
                    return Some(TestFrameworkInfo {
                        name: "Cypress".to_string(),
                        command: "pnpm cypress run --reporter json".to_string(),
                        config_file,
                        coverage_command: None,
                    });
                }
            }
        }
    }

    None
}

/// Find the first existing config file from a list of candidates
fn find_config_file(path: &Path, candidates: &[&str]) -> Option<String> {
    for candidate in candidates {
        if path.join(candidate).exists() {
            return Some(candidate.to_string());
        }
    }
    None
}

/// Merge dependencies and devDependencies from package.json
fn merge_deps(pkg: &serde_json::Value) -> HashMap<String, bool> {
    let mut deps = HashMap::new();
    for key in &["dependencies", "devDependencies", "peerDependencies"] {
        if let Some(obj) = pkg.get(key).and_then(|v| v.as_object()) {
            for dep_name in obj.keys() {
                deps.insert(dep_name.clone(), true);
            }
        }
    }
    deps
}

/// Result of running tests
#[derive(Debug, Clone)]
pub struct TestExecutionResult {
    pub success: bool,
    pub total: u32,
    pub passed: u32,
    pub failed: u32,
    pub skipped: u32,
    pub duration_ms: u64,
    pub coverage_percent: Option<f64>,
    pub stdout: String,
    pub stderr: String,
    pub test_results: Vec<IndividualTestResult>,
}

/// Result for a single test
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct IndividualTestResult {
    pub name: String,
    pub file_path: Option<String>,
    pub passed: bool,
    pub duration_ms: Option<u64>,
    pub error_message: Option<String>,
}

/// Execute tests for a project using the detected framework.
/// Returns structured test results.
pub fn run_tests(
    project_path: &str,
    framework: &TestFrameworkInfo,
    with_coverage: bool,
) -> Result<TestExecutionResult, String> {
    let command = if with_coverage {
        framework
            .coverage_command
            .as_ref()
            .unwrap_or(&framework.command)
    } else {
        &framework.command
    };

    // Parse command into program and args
    let parts: Vec<&str> = command.split_whitespace().collect();
    if parts.is_empty() {
        return Err("Empty test command".to_string());
    }

    let program = parts[0];
    let args = &parts[1..];

    let output = Command::new(program)
        .args(args)
        .current_dir(project_path)
        .output()
        .map_err(|e| format!("Failed to execute test command: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    // Parse output based on framework
    let result = match framework.name.as_str() {
        "Vitest" => parse_vitest_output(&stdout, &stderr, &output),
        "Jest" => parse_jest_output(&stdout, &stderr, &output),
        "cargo test" => parse_cargo_test_output(&stdout, &stderr, &output),
        "Playwright" => parse_playwright_output(&stdout, &stderr, &output),
        "pytest" => parse_pytest_output(&stdout, &stderr, &output),
        _ => parse_generic_output(&stdout, &stderr, &output),
    };

    // Try to extract coverage if requested
    let coverage = if with_coverage {
        extract_coverage(project_path, &framework.name)
    } else {
        None
    };

    Ok(TestExecutionResult {
        coverage_percent: coverage,
        ..result
    })
}

/// Parse Vitest JSON output
pub fn parse_vitest_output(stdout: &str, stderr: &str, output: &Output) -> TestExecutionResult {
    // Try to parse JSON output
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(stdout) {
        let mut total = 0u32;
        let mut passed = 0u32;
        let mut failed = 0u32;
        let mut skipped = 0u32;
        let mut test_results = Vec::new();

        // Vitest JSON format has testResults array
        if let Some(test_results_arr) = json.get("testResults").and_then(|v| v.as_array()) {
            for file_result in test_results_arr {
                if let Some(assertions) =
                    file_result.get("assertionResults").and_then(|v| v.as_array())
                {
                    let file_path = file_result
                        .get("name")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());

                    for assertion in assertions {
                        total += 1;
                        let status = assertion
                            .get("status")
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown");
                        let name = assertion
                            .get("fullName")
                            .or_else(|| assertion.get("title"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown")
                            .to_string();
                        let duration = assertion
                            .get("duration")
                            .and_then(|v| v.as_u64());

                        let (is_passed, error_msg) = match status {
                            "passed" => {
                                passed += 1;
                                (true, None)
                            }
                            "failed" => {
                                failed += 1;
                                let error = assertion
                                    .get("failureMessages")
                                    .and_then(|v| v.as_array())
                                    .and_then(|arr| arr.first())
                                    .and_then(|v| v.as_str())
                                    .map(|s| s.to_string());
                                (false, error)
                            }
                            "skipped" | "pending" | "todo" => {
                                skipped += 1;
                                (true, None)
                            }
                            _ => (false, None),
                        };

                        test_results.push(IndividualTestResult {
                            name,
                            file_path: file_path.clone(),
                            passed: is_passed,
                            duration_ms: duration,
                            error_message: error_msg,
                        });
                    }
                }
            }
        }

        let duration_ms = json
            .get("startTime")
            .and_then(|start| {
                json.get("endTime").and_then(|end| {
                    let s = start.as_u64()?;
                    let e = end.as_u64()?;
                    Some(e.saturating_sub(s))
                })
            })
            .unwrap_or(0);

        return TestExecutionResult {
            success: output.status.success() && failed == 0,
            total,
            passed,
            failed,
            skipped,
            duration_ms,
            coverage_percent: None,
            stdout: stdout.to_string(),
            stderr: stderr.to_string(),
            test_results,
        };
    }

    // Fallback to generic parsing
    parse_generic_output(stdout, stderr, output)
}

/// Parse Jest JSON output
pub fn parse_jest_output(stdout: &str, stderr: &str, output: &Output) -> TestExecutionResult {
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(stdout) {
        let mut test_results = Vec::new();

        let total = json
            .get("numTotalTests")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as u32;
        let passed = json
            .get("numPassedTests")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as u32;
        let failed = json
            .get("numFailedTests")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as u32;
        let skipped = json
            .get("numPendingTests")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as u32;

        // Parse individual test results
        if let Some(test_results_arr) = json.get("testResults").and_then(|v| v.as_array()) {
            for file_result in test_results_arr {
                let file_path = file_result
                    .get("name")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                if let Some(assertions) =
                    file_result.get("assertionResults").and_then(|v| v.as_array())
                {
                    for assertion in assertions {
                        let status = assertion
                            .get("status")
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown");
                        let name = assertion
                            .get("fullName")
                            .or_else(|| assertion.get("title"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown")
                            .to_string();
                        let duration = assertion.get("duration").and_then(|v| v.as_u64());

                        let is_passed = status == "passed";
                        let error_msg = if !is_passed {
                            assertion
                                .get("failureMessages")
                                .and_then(|v| v.as_array())
                                .and_then(|arr| arr.first())
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string())
                        } else {
                            None
                        };

                        test_results.push(IndividualTestResult {
                            name,
                            file_path: file_path.clone(),
                            passed: is_passed,
                            duration_ms: duration,
                            error_message: error_msg,
                        });
                    }
                }
            }
        }

        return TestExecutionResult {
            success: json
                .get("success")
                .and_then(|v| v.as_bool())
                .unwrap_or(false),
            total,
            passed,
            failed,
            skipped,
            duration_ms: 0,
            coverage_percent: None,
            stdout: stdout.to_string(),
            stderr: stderr.to_string(),
            test_results,
        };
    }

    parse_generic_output(stdout, stderr, output)
}

/// Parse cargo test output (text format)
pub fn parse_cargo_test_output(stdout: &str, stderr: &str, output: &Output) -> TestExecutionResult {
    let mut total = 0u32;
    let mut passed = 0u32;
    let mut failed = 0u32;
    let mut skipped = 0u32;
    let mut test_results = Vec::new();

    // Parse lines like "test module::test_name ... ok"
    for line in stdout.lines() {
        if line.starts_with("test ") && (line.contains(" ... ok") || line.contains(" ... FAILED") || line.contains(" ... ignored")) {
            total += 1;

            // Extract test name
            let name = line
                .strip_prefix("test ")
                .and_then(|s| s.split(" ... ").next())
                .unwrap_or("unknown")
                .to_string();

            if line.contains(" ... ok") {
                passed += 1;
                test_results.push(IndividualTestResult {
                    name,
                    file_path: None,
                    passed: true,
                    duration_ms: None,
                    error_message: None,
                });
            } else if line.contains(" ... FAILED") {
                failed += 1;
                test_results.push(IndividualTestResult {
                    name,
                    file_path: None,
                    passed: false,
                    duration_ms: None,
                    error_message: Some("Test failed".to_string()),
                });
            } else if line.contains(" ... ignored") {
                skipped += 1;
                test_results.push(IndividualTestResult {
                    name,
                    file_path: None,
                    passed: true,
                    duration_ms: None,
                    error_message: None,
                });
            }
        }
    }

    // Also check the summary line
    // "test result: ok. 10 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out"
    for line in stdout.lines() {
        if line.starts_with("test result:") {
            // If we have a summary but no individual results, use summary counts
            if total == 0 {
                if let Some(caps) = parse_cargo_summary(line) {
                    total = caps.0 + caps.1 + caps.2;
                    passed = caps.0;
                    failed = caps.1;
                    skipped = caps.2;
                }
            }
            break;
        }
    }

    TestExecutionResult {
        success: output.status.success() && failed == 0,
        total,
        passed,
        failed,
        skipped,
        duration_ms: 0,
        coverage_percent: None,
        stdout: stdout.to_string(),
        stderr: stderr.to_string(),
        test_results,
    }
}

/// Parse cargo test summary line
fn parse_cargo_summary(line: &str) -> Option<(u32, u32, u32)> {
    // "test result: ok. 10 passed; 0 failed; 1 ignored; ..."
    // Use extract_number_before to find the number immediately before each keyword
    let passed = extract_number_before(line, "passed").unwrap_or(0);
    let failed = extract_number_before(line, "failed").unwrap_or(0);
    let ignored = extract_number_before(line, "ignored").unwrap_or(0);

    Some((passed, failed, ignored))
}

/// Parse Playwright JSON output
pub fn parse_playwright_output(stdout: &str, stderr: &str, output: &Output) -> TestExecutionResult {
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(stdout) {
        let mut total = 0u32;
        let mut passed = 0u32;
        let mut failed = 0u32;
        let mut skipped = 0u32;
        let mut test_results = Vec::new();

        // Playwright JSON format has suites array
        if let Some(suites) = json.get("suites").and_then(|v| v.as_array()) {
            for suite in suites {
                parse_playwright_suite(suite, &mut total, &mut passed, &mut failed, &mut skipped, &mut test_results);
            }
        }

        let duration_ms = json
            .get("stats")
            .and_then(|s| s.get("duration"))
            .and_then(|v| v.as_u64())
            .unwrap_or(0);

        return TestExecutionResult {
            success: output.status.success() && failed == 0,
            total,
            passed,
            failed,
            skipped,
            duration_ms,
            coverage_percent: None,
            stdout: stdout.to_string(),
            stderr: stderr.to_string(),
            test_results,
        };
    }

    parse_generic_output(stdout, stderr, output)
}

/// Recursively parse Playwright suite
fn parse_playwright_suite(
    suite: &serde_json::Value,
    total: &mut u32,
    passed: &mut u32,
    failed: &mut u32,
    skipped: &mut u32,
    results: &mut Vec<IndividualTestResult>,
) {
    // Parse specs (tests)
    if let Some(specs) = suite.get("specs").and_then(|v| v.as_array()) {
        for spec in specs {
            if let Some(tests) = spec.get("tests").and_then(|v| v.as_array()) {
                for test in tests {
                    *total += 1;
                    let title = spec
                        .get("title")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown")
                        .to_string();
                    let file_path = spec.get("file").and_then(|v| v.as_str()).map(|s| s.to_string());

                    let status = test
                        .get("status")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown");

                    let duration = test
                        .get("results")
                        .and_then(|v| v.as_array())
                        .and_then(|arr| arr.first())
                        .and_then(|r| r.get("duration"))
                        .and_then(|v| v.as_u64());

                    let (is_passed, error_msg) = match status {
                        "expected" | "passed" => {
                            *passed += 1;
                            (true, None)
                        }
                        "unexpected" | "failed" => {
                            *failed += 1;
                            let error = test
                                .get("results")
                                .and_then(|v| v.as_array())
                                .and_then(|arr| arr.first())
                                .and_then(|r| r.get("error"))
                                .and_then(|e| e.get("message"))
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string());
                            (false, error)
                        }
                        "skipped" => {
                            *skipped += 1;
                            (true, None)
                        }
                        _ => (false, None),
                    };

                    results.push(IndividualTestResult {
                        name: title,
                        file_path,
                        passed: is_passed,
                        duration_ms: duration,
                        error_message: error_msg,
                    });
                }
            }
        }
    }

    // Recursively process nested suites
    if let Some(nested_suites) = suite.get("suites").and_then(|v| v.as_array()) {
        for nested in nested_suites {
            parse_playwright_suite(nested, total, passed, failed, skipped, results);
        }
    }
}

/// Parse pytest output
pub fn parse_pytest_output(stdout: &str, stderr: &str, output: &Output) -> TestExecutionResult {
    let mut passed = 0u32;
    let mut failed = 0u32;
    let mut skipped = 0u32;
    let mut test_results = Vec::new();

    // Parse summary line: "10 passed, 2 failed, 1 skipped in 1.23s"
    for line in stdout.lines().chain(stderr.lines()) {
        if line.contains(" passed") || line.contains(" failed") || line.contains(" skipped") {
            for part in line.split(',') {
                let part = part.trim();
                if part.contains("passed") {
                    if let Some(num) = part.split_whitespace().next() {
                        passed = num.parse().unwrap_or(0);
                    }
                } else if part.contains("failed") {
                    if let Some(num) = part.split_whitespace().next() {
                        failed = num.parse().unwrap_or(0);
                    }
                } else if part.contains("skipped") {
                    if let Some(num) = part.split_whitespace().next() {
                        skipped = num.parse().unwrap_or(0);
                    }
                }
            }
        }
    }

    let total = passed + failed + skipped;

    // Parse individual test results from verbose output
    for line in stdout.lines() {
        if line.contains("PASSED") || line.contains("FAILED") || line.contains("SKIPPED") {
            let name = line.split("::").last().unwrap_or("unknown").to_string();
            let name = name.split_whitespace().next().unwrap_or("unknown").to_string();

            let is_passed = line.contains("PASSED");
            let is_skipped = line.contains("SKIPPED");

            if !is_skipped {
                test_results.push(IndividualTestResult {
                    name,
                    file_path: None,
                    passed: is_passed,
                    duration_ms: None,
                    error_message: if !is_passed { Some("Test failed".to_string()) } else { None },
                });
            }
        }
    }

    TestExecutionResult {
        success: output.status.success() && failed == 0,
        total,
        passed,
        failed,
        skipped,
        duration_ms: 0,
        coverage_percent: None,
        stdout: stdout.to_string(),
        stderr: stderr.to_string(),
        test_results,
    }
}

/// Generic output parser for unknown frameworks
pub fn parse_generic_output(stdout: &str, stderr: &str, output: &Output) -> TestExecutionResult {
    // Try to extract basic counts from common patterns
    let mut passed = 0u32;
    let mut failed = 0u32;
    let combined = format!("{}\n{}", stdout, stderr);

    // Look for common patterns
    for line in combined.lines() {
        let line_lower = line.to_lowercase();
        if line_lower.contains("pass") {
            if let Some(num) = extract_number_before(&line_lower, "pass") {
                passed = num;
            }
        }
        if line_lower.contains("fail") {
            if let Some(num) = extract_number_before(&line_lower, "fail") {
                failed = num;
            }
        }
    }

    TestExecutionResult {
        success: output.status.success(),
        total: passed + failed,
        passed,
        failed,
        skipped: 0,
        duration_ms: 0,
        coverage_percent: None,
        stdout: stdout.to_string(),
        stderr: stderr.to_string(),
        test_results: Vec::new(),
    }
}

/// Extract a number that appears before a keyword
fn extract_number_before(text: &str, keyword: &str) -> Option<u32> {
    if let Some(pos) = text.find(keyword) {
        let before = &text[..pos];
        for word in before.split_whitespace().rev() {
            if let Ok(num) = word.parse::<u32>() {
                return Some(num);
            }
        }
    }
    None
}

/// Extract coverage percentage from coverage files
fn extract_coverage(project_path: &str, _framework_name: &str) -> Option<f64> {
    let path = Path::new(project_path);

    // Common coverage file locations
    let coverage_files = [
        "coverage/lcov.info",
        "coverage/lcov-report/lcov.info",
        "target/coverage/lcov.info",
        "coverage.lcov",
        ".coverage",
    ];

    for coverage_file in &coverage_files {
        let coverage_path = path.join(coverage_file);
        if coverage_path.exists()
            && (coverage_file.ends_with(".info") || coverage_file.ends_with(".lcov")) {
                return parse_coverage_lcov(&coverage_path);
            }
    }

    // Check for coverage in JSON format (common for JS tools)
    let json_coverage_path = path.join("coverage/coverage-summary.json");
    if json_coverage_path.exists() {
        if let Ok(content) = fs::read_to_string(&json_coverage_path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(total) = json.get("total") {
                    if let Some(lines) = total.get("lines") {
                        if let Some(pct) = lines.get("pct").and_then(|v| v.as_f64()) {
                            return Some(pct);
                        }
                    }
                }
            }
        }
    }

    None
}

/// Parse coverage percentage from lcov.info file
pub fn parse_coverage_lcov(path: &Path) -> Option<f64> {
    let content = fs::read_to_string(path).ok()?;

    let mut lines_found = 0u64;
    let mut lines_hit = 0u64;

    for line in content.lines() {
        if let Some(stripped) = line.strip_prefix("LF:") {
            if let Ok(count) = stripped.parse::<u64>() {
                lines_found += count;
            }
        } else if let Some(stripped) = line.strip_prefix("LH:") {
            if let Ok(count) = stripped.parse::<u64>() {
                lines_hit += count;
            }
        }
    }

    if lines_found > 0 {
        Some((lines_hit as f64 / lines_found as f64) * 100.0)
    } else {
        None
    }
}

// =============================================================================
// Test Discovery (count tests without running them)
// =============================================================================

/// Discover and count tests in a project without executing them.
/// Returns (test_count, framework_name, method).
/// Tries framework-specific list commands first, falls back to static grep.
pub fn count_tests(project_path: &str) -> Result<(u32, String, String), String> {
    let path = Path::new(project_path);

    // Try framework-specific list commands first
    if let Some(result) = count_vitest(path) {
        return Ok(result);
    }
    if let Some(result) = count_playwright(path) {
        return Ok(result);
    }
    if let Some(result) = count_cargo_tests(path) {
        return Ok(result);
    }
    if let Some(result) = count_pytest(path) {
        return Ok(result);
    }
    if let Some(result) = count_go_tests(path) {
        return Ok(result);
    }

    // Fallback: static grep across all test files
    let count = count_static_grep(path);
    if count > 0 {
        Ok((count, "static_grep".to_string(), "static_grep".to_string()))
    } else {
        Ok((0, "none".to_string(), "static_grep".to_string()))
    }
}

/// Count tests via `npx vitest --list` (parses line count of test names).
fn count_vitest(path: &Path) -> Option<(u32, String, String)> {
    // Only try if vitest is a dependency
    let pkg_json = path.join("package.json");
    if pkg_json.exists() {
        if let Ok(content) = fs::read_to_string(&pkg_json) {
            if !content.contains("vitest") {
                return None;
            }
        } else {
            return None;
        }
    } else {
        return None;
    }

    let output = Command::new("npx")
        .args(["vitest", "--list", "--reporter=verbose"])
        .current_dir(path)
        .env("CI", "true")
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    // Each test line starts with spaces and contains a test name
    // Count non-empty, non-heading lines
    let count = stdout
        .lines()
        .filter(|line| {
            let trimmed = line.trim();
            !trimmed.is_empty()
                && !trimmed.starts_with("RUN")
                && !trimmed.starts_with("Test Files")
                && !trimmed.starts_with("Tests")
                && !trimmed.starts_with("Duration")
                && !trimmed.starts_with("Start")
                && !trimmed.contains(".test.")
                && !trimmed.contains(".spec.")
                && trimmed.starts_with(' ')
        })
        .count() as u32;

    if count > 0 {
        Some((count, "Vitest".to_string(), "list_command".to_string()))
    } else {
        None
    }
}

/// Count tests via `npx playwright test --list`.
fn count_playwright(path: &Path) -> Option<(u32, String, String)> {
    let pkg_json = path.join("package.json");
    if pkg_json.exists() {
        if let Ok(content) = fs::read_to_string(&pkg_json) {
            if !content.contains("playwright") {
                return None;
            }
        } else {
            return None;
        }
    } else {
        return None;
    }

    let output = Command::new("npx")
        .args(["playwright", "test", "--list"])
        .current_dir(path)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    // Playwright --list outputs lines like "  [chromium] > test.spec.ts:5:3 > test name"
    let count = stdout
        .lines()
        .filter(|line| {
            let trimmed = line.trim();
            !trimmed.is_empty() && (trimmed.contains('>') || trimmed.contains("test"))
        })
        .count() as u32;

    if count > 0 {
        Some((count, "Playwright".to_string(), "list_command".to_string()))
    } else {
        None
    }
}

/// Count tests via `cargo test -- --list` and grep for `: test$`.
fn count_cargo_tests(path: &Path) -> Option<(u32, String, String)> {
    if !path.join("Cargo.toml").exists() {
        return None;
    }

    let output = Command::new("cargo")
        .args(["test", "--", "--list"])
        .current_dir(path)
        .output()
        .ok()?;

    // cargo test -- --list returns success even if there are no tests
    let stdout = String::from_utf8_lossy(&output.stdout);
    let count = stdout
        .lines()
        .filter(|line| line.ends_with(": test"))
        .count() as u32;

    if count > 0 {
        Some((count, "cargo test".to_string(), "list_command".to_string()))
    } else {
        None
    }
}

/// Count tests via `pytest --collect-only -q`.
fn count_pytest(path: &Path) -> Option<(u32, String, String)> {
    let has_pytest = path.join("pytest.ini").exists()
        || path.join("conftest.py").exists()
        || path.join("pyproject.toml").exists();

    if !has_pytest {
        return None;
    }

    let output = Command::new("pytest")
        .args(["--collect-only", "-q"])
        .current_dir(path)
        .output()
        .ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    // Last line is typically "X tests collected" or "X test collected"
    for line in stdout.lines().rev() {
        if line.contains("test") && line.contains("collected") {
            // Parse "X tests collected" or "X test collected"
            if let Some(num_str) = line.split_whitespace().next() {
                if let Ok(count) = num_str.parse::<u32>() {
                    return Some((count, "pytest".to_string(), "list_command".to_string()));
                }
            }
        }
    }

    None
}

/// Count tests via `go test -list '.*' ./...`.
fn count_go_tests(path: &Path) -> Option<(u32, String, String)> {
    if !path.join("go.mod").exists() {
        return None;
    }

    let output = Command::new("go")
        .args(["test", "-list", ".*", "./..."])
        .current_dir(path)
        .output()
        .ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let count = stdout
        .lines()
        .filter(|line| {
            let trimmed = line.trim();
            !trimmed.is_empty() && !trimmed.starts_with("ok") && !trimmed.starts_with("?")
        })
        .count() as u32;

    if count > 0 {
        Some((count, "go test".to_string(), "list_command".to_string()))
    } else {
        None
    }
}

/// Count tests by statically grepping test files for test patterns.
/// This is the universal fallback that works without installing any tools.
/// Fast enough to call on every health score poll (~milliseconds).
pub fn count_static_grep(path: &Path) -> u32 {
    count_test_patterns_recursive(path, 0)
}

/// Recursively walk directories counting test pattern matches in test files.
fn count_test_patterns_recursive(dir: &Path, depth: u32) -> u32 {
    // Don't recurse too deeply
    if depth > 10 {
        return 0;
    }

    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return 0,
    };

    let mut count = 0u32;

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip common non-source directories
        if name.starts_with('.')
            || name == "node_modules"
            || name == "target"
            || name == "dist"
            || name == "build"
            || name == ".git"
            || name == "__pycache__"
            || name == "vendor"
        {
            continue;
        }

        if path.is_dir() {
            count += count_test_patterns_recursive(&path, depth + 1);
        } else if is_test_file(&name) {
            if let Ok(content) = fs::read_to_string(&path) {
                count += count_test_calls(&content, &name);
            }
        } else if name.ends_with(".rs") {
            // Rust uses inline #[test] in regular source files
            if let Ok(content) = fs::read_to_string(&path) {
                count += content.matches("#[test]").count() as u32;
            }
        }
    }

    count
}

/// Check if a filename matches common test file naming patterns.
pub fn is_test_file(name: &str) -> bool {
    let lower = name.to_lowercase();

    // JS/TS: *.test.*, *.spec.*
    if lower.contains(".test.") || lower.contains(".spec.") {
        return true;
    }

    // Python: test_*.py
    if lower.starts_with("test_") && lower.ends_with(".py") {
        return true;
    }

    // Go: *_test.go
    if lower.ends_with("_test.go") {
        return true;
    }

    // Rust files with inline tests are handled separately — here we look
    // for dedicated test files only. Rust inline tests in source files are
    // also counted if the source file itself is a test file name pattern.

    false
}

/// Count test invocations within file content based on language patterns.
pub fn count_test_calls(content: &str, filename: &str) -> u32 {
    let lower_filename = filename.to_lowercase();
    let mut count = 0u32;

    if lower_filename.ends_with(".rs") {
        // Rust: count #[test] attributes
        count += content.matches("#[test]").count() as u32;
    } else if lower_filename.ends_with(".py") {
        // Python: count `def test_` function definitions
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("def test_") || trimmed.starts_with("async def test_") {
                count += 1;
            }
        }
    } else if lower_filename.ends_with(".go") {
        // Go: count `func Test` function definitions
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("func Test") {
                count += 1;
            }
        }
    } else {
        // JS/TS: count `it(`, `test(`, `it.each(`, `test.each(`
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("it(")
                || trimmed.starts_with("it.each(")
                || trimmed.starts_with("test(")
                || trimmed.starts_with("test.each(")
            {
                count += 1;
            }
        }
    }

    count
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_framework_self() {
        // Test on our own project (should detect cargo test)
        let result = detect_test_framework(env!("CARGO_MANIFEST_DIR"));
        assert!(result.is_some());
        let framework = result.unwrap();
        assert_eq!(framework.name, "cargo test");
    }

    #[test]
    fn test_parse_cargo_summary() {
        let line = "test result: ok. 10 passed; 2 failed; 1 ignored; 0 measured; 0 filtered out";
        let result = parse_cargo_summary(line);
        assert!(result.is_some());
        let (passed, failed, ignored) = result.unwrap();
        assert_eq!(passed, 10);
        assert_eq!(failed, 2);
        assert_eq!(ignored, 1);
    }

    #[test]
    fn test_extract_number_before() {
        assert_eq!(extract_number_before("10 passed", "passed"), Some(10));
        assert_eq!(extract_number_before("Tests: 5 failed", "failed"), Some(5));
        assert_eq!(extract_number_before("no numbers here", "here"), None);
    }

    #[test]
    fn test_count_test_calls_js() {
        let content = r#"
describe("App", () => {
  it("should render", () => {});
  it("should handle click", () => {});
  test("should update state", () => {});
  test.each([1, 2])("should work for %d", () => {});
});
"#;
        assert_eq!(count_test_calls(content, "App.test.tsx"), 4);
    }

    #[test]
    fn test_count_test_calls_rust() {
        let content = r#"
#[cfg(test)]
mod tests {
    #[test]
    fn test_one() {}

    #[test]
    fn test_two() {}
}
"#;
        assert_eq!(count_test_calls(content, "health.rs"), 2);
    }

    #[test]
    fn test_count_test_calls_python() {
        let content = r#"
import pytest

def test_add():
    assert 1 + 1 == 2

def test_subtract():
    assert 2 - 1 == 1

async def test_async_op():
    pass

def helper_function():
    pass
"#;
        assert_eq!(count_test_calls(content, "test_math.py"), 3);
    }

    #[test]
    fn test_is_test_file() {
        assert!(is_test_file("App.test.tsx"));
        assert!(is_test_file("utils.spec.ts"));
        assert!(is_test_file("test_models.py"));
        assert!(is_test_file("server_test.go"));
        assert!(!is_test_file("App.tsx"));
        assert!(!is_test_file("health.rs"));
        assert!(!is_test_file("main.py"));
        assert!(!is_test_file("server.go"));
        assert!(!is_test_file("package.json"));
    }

    #[test]
    fn test_count_static_grep_self_project() {
        // Run static grep on our own project — should find #[test] annotations
        let path = Path::new(env!("CARGO_MANIFEST_DIR"));
        let count = count_static_grep(path);
        // We have many cargo tests, so count should be > 0
        assert!(count > 0, "Expected > 0 tests from static grep, got {}", count);
    }

    #[test]
    fn test_merge_deps() {
        let pkg: serde_json::Value = serde_json::json!({
            "dependencies": { "vitest": "^1.0" },
            "devDependencies": { "typescript": "^5.0" }
        });
        let deps = merge_deps(&pkg);
        assert!(deps.contains_key("vitest"));
        assert!(deps.contains_key("typescript"));
        assert!(!deps.contains_key("jest"));
    }
}
