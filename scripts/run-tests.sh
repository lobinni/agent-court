#!/bin/bash
# run-test wrapper — invokes vitest via npm and maps failures for CI/k8s
npm run test
exit $?
