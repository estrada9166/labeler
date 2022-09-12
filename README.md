# Workflow PR Labeler

Update and assign pull request labels given configuration

## Debugging

## Create a config file in the root of your project
```yml
onComment:
  remove:
    - Changes Requested
    - Approved
  set:
    - Commented

onApproved:
  remove:
    - Commented
    - Changes Requested
    - Work in progress
  set:
    - First review
    - Ready to merge

onOpen:
  set:
    - Work in progress

onClosed:
  set:
    - Closed

onMerged:
  remove:
    - Work in progress
    - Closed
  set:
    - Merged

onChangesRequested:
  remove:
    - Approved
    - Commented
  set:
    - Ready to merge
```

## Create a workflow:
```yml
name: Assign pull request labels based on labeler configuration

on: [pull_request, pull_request_review, pull_request_review_comment]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@master
    - name: Labeler
      uses: igoroctaviano/workflow-pr-labeler@v1
      with:
        GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
        CONFIG_PATH: labeler-config.yml
```